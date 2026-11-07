<?php
/*
 * Metal Detector – KI-Server (PHP, z. B. IONOS-Webhosting)
 *
 * Die App schickt hierher nur den Gesprächsverlauf und die Modellwahl.
 * Der Server ergänzt den festen Auftrag (System-Prompt) und die Werkzeuge aus ai-config.json,
 * hängt den geheimen API-Schlüssel aus config.php an und fragt Claude.
 * So bleibt der Schlüssel geheim und der Server lässt sich nicht für andere Zwecke nutzen.
 *
 * Schutz gegen hohe Kosten:
 *   - nur erlaubte Herkunft (deine Seiten)
 *   - Begrenzung pro Nutzer (IP) und Minute
 *   - Tageslimit für alle Nutzer zusammen (Opus zählt teurer als Haiku)
 *   - kurze Antworten, begrenzte Gesprächslänge
 */

declare(strict_types=1);

use Anthropic\Client;
use Anthropic\Core\Exceptions\APIConnectionException;
use Anthropic\Core\Exceptions\APIStatusException;
use Anthropic\Core\Exceptions\AuthenticationException;
use Anthropic\Core\Exceptions\BadRequestException;
use Anthropic\Core\Exceptions\PermissionDeniedException;
use Anthropic\Core\Exceptions\RateLimitException;

header('Content-Type: application/json; charset=utf-8');
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');

function reply(int $status, array $body): never
{
    http_response_code($status);
    echo json_encode($body, JSON_UNESCAPED_UNICODE | JSON_UNESCAPED_SLASHES);
    exit;
}

$configFile = __DIR__ . '/config.php';
if (!is_file($configFile)) {
    reply(500, ['error' => 'Server nicht eingerichtet (config.php fehlt)']);
}
/** @var array{anthropic_api_key:string, allowed_origins:list<string>, daily_budget?:int, opus_cost?:int, per_minute?:int, anthropic_base_url?:string} $config */
$config = require $configFile;
$ai = json_decode((string) file_get_contents(__DIR__ . '/ai-config.json'), true);
$limits = $ai['limits'];

// ---------- Herkunft prüfen (CORS) ----------

$origin = $_SERVER['HTTP_ORIGIN'] ?? '';
$originAllowed = $origin !== '' && in_array($origin, $config['allowed_origins'], true);
if ($originAllowed) {
    header('Access-Control-Allow-Origin: ' . $origin);
    header('Access-Control-Allow-Methods: POST, OPTIONS');
    header('Access-Control-Allow-Headers: Content-Type');
    header('Access-Control-Max-Age: 86400');
    header('Vary: Origin');
}

$method = $_SERVER['REQUEST_METHOD'] ?? 'GET';
if ($method === 'OPTIONS') {
    http_response_code($originAllowed ? 204 : 403);
    exit;
}
if ($method === 'GET' && isset($_GET['health'])) {
    reply(200, ['ok' => true, 'configured' => ($config['anthropic_api_key'] ?? '') !== '']);
}
if ($method !== 'POST') {
    reply(405, ['error' => 'Nur POST erlaubt']);
}
if (!$originAllowed) {
    reply(403, ['error' => 'Herkunft nicht erlaubt']);
}
if (($config['anthropic_api_key'] ?? '') === '') {
    reply(500, ['error' => 'Server nicht eingerichtet (API-Schlüssel fehlt)']);
}

// ---------- Kleine Datei-Datenbank (mit Sperre, damit gleichzeitige Anfragen sich nicht stören) ----------

$dataDir = __DIR__ . '/data';
if (!is_dir($dataDir)) {
    @mkdir($dataDir, 0750, true);
}

/** Liest eine JSON-Datei gesperrt, lässt $fn sie ändern und speichert das Ergebnis. */
function withLockedJson(string $file, callable $fn): mixed
{
    $h = fopen($file, 'c+');
    if ($h === false) {
        return $fn([])[1];
    }
    try {
        flock($h, LOCK_EX);
        $raw = stream_get_contents($h);
        $data = $raw ? (json_decode($raw, true) ?: []) : [];
        [$newData, $result] = $fn($data);
        ftruncate($h, 0);
        rewind($h);
        fwrite($h, json_encode($newData));
        fflush($h);
        return $result;
    } finally {
        flock($h, LOCK_UN);
        fclose($h);
    }
}

// Ab und zu alte Dateien wegräumen
if (mt_rand(1, 50) === 1) {
    foreach (glob($dataDir . '/*.json') ?: [] as $f) {
        if (filemtime($f) < time() - 3 * 86400 || (str_starts_with(basename($f), 'rate-') && filemtime($f) < time() - 300)) {
            @unlink($f);
        }
    }
}

// ---------- 1. Begrenzung pro Nutzer und Minute ----------

$ip = $_SERVER['REMOTE_ADDR'] ?? 'unknown';
$perMinute = (int) ($config['per_minute'] ?? 20);
$allowed = withLockedJson($dataDir . '/rate-' . sha1($ip . __DIR__) . '.json', function (array $hits) use ($perMinute) {
    $now = time();
    $hits = array_values(array_filter($hits, fn($t) => is_int($t) && $t > $now - 60));
    if (count($hits) >= $perMinute) {
        return [$hits, false];
    }
    $hits[] = $now;
    return [$hits, true];
});
if (!$allowed) {
    reply(429, ['error' => 'rate-limit', 'message' => 'Kurz durchatmen – zu viele Nachrichten in einer Minute.']);
}

// ---------- 2. Anfrage lesen und prüfen ----------

$raw = (string) file_get_contents('php://input');
if (strlen($raw) > $limits['maxPayloadChars'] + 20000) {
    reply(413, ['error' => 'history-too-long']);
}
$body = json_decode($raw, true);
if (!is_array($body)) {
    reply(400, ['error' => 'Ungültiges JSON']);
}
$modelKey = ($body['model'] ?? '') === 'opus' ? 'opus' : 'haiku';
$messages = $body['messages'] ?? null;

function validateMessages(mixed $messages, array $limits): ?string
{
    $allowedBlocks = ['text', 'tool_use', 'tool_result', 'thinking', 'redacted_thinking', 'fallback'];
    $maxChars = $limits['maxUserChars'] + 300;
    if (!is_array($messages) || $messages === [] || !array_is_list($messages)) {
        return 'Keine Nachrichten';
    }
    if (count($messages) > $limits['maxMessages'] + $limits['maxToolRounds'] * 2 + 2) {
        return 'history-too-long';
    }
    foreach ($messages as $i => $m) {
        $role = $m['role'] ?? null;
        $content = $m['content'] ?? null;
        if ($role !== 'user' && $role !== 'assistant') {
            return 'Ungültige Rolle';
        }
        if ($i === 0 && $role !== 'user') {
            return 'Erste Nachricht muss vom Nutzer sein';
        }
        if (is_string($content)) {
            if ($role === 'user' && mb_strlen($content) > $maxChars) {
                return 'Nachricht zu lang';
            }
            continue;
        }
        if (!is_array($content) || $content === []) {
            return 'Ungültiger Inhalt';
        }
        foreach ($content as $block) {
            $type = is_array($block) ? ($block['type'] ?? null) : null;
            if (!is_string($type) || !in_array($type, $allowedBlocks, true)) {
                return 'Blocktyp nicht erlaubt: ' . (is_string($type) ? $type : '?');
            }
            if ($role === 'user' && $type === 'text' && mb_strlen((string) ($block['text'] ?? '')) > $maxChars) {
                return 'Nachricht zu lang';
            }
        }
    }
    return null;
}

$problem = validateMessages($messages, $limits);
if ($problem !== null) {
    reply($problem === 'history-too-long' ? 413 : 400, ['error' => $problem]);
}

// PHP macht aus leeren JSON-Objekten {} leere Listen [] – für Werkzeug-Eingaben wieder zu Objekten machen
foreach ($messages as &$m) {
    if (is_array($m['content'])) {
        foreach ($m['content'] as &$block) {
            if (($block['type'] ?? '') === 'tool_use' && ($block['input'] ?? []) === []) {
                $block['input'] = new stdClass();
            }
        }
        unset($block);
    }
}
unset($m);

// ---------- 3. Tageslimit für alle zusammen ----------

$units = $modelKey === 'opus' ? (int) ($config['opus_cost'] ?? 25) : 1;
$dailyBudget = (int) ($config['daily_budget'] ?? 1000);
$withinBudget = withLockedJson($dataDir . '/budget-' . gmdate('Y-m-d') . '.json', function (array $d) use ($units, $dailyBudget) {
    $used = (int) ($d['used'] ?? 0);
    if ($used + $units > $dailyBudget) {
        return [$d, false];
    }
    return [['used' => $used + $units], true];
});
if (!$withinBudget) {
    reply(429, ['error' => 'daily-limit', 'message' => 'Das KI-Tageslimit ist erreicht – morgen geht\'s weiter. Bis dahin antworte ich ohne KI.']);
}

// ---------- 4. Claude fragen ----------

// Leere "properties" der Werkzeug-Schemas müssen JSON-Objekte bleiben
$tools = array_map(function (array $tool) {
    if (($tool['input_schema']['properties'] ?? null) === []) {
        $tool['input_schema']['properties'] = new stdClass();
    }
    return $tool;
}, $ai['tools']);

require __DIR__ . '/vendor/autoload.php';

try {
    $client = new Client(
        apiKey: $config['anthropic_api_key'],
        baseUrl: ($config['anthropic_base_url'] ?? '') !== '' ? $config['anthropic_base_url'] : null,
        requestOptions: ['timeout' => 55.0, 'maxRetries' => 1],
    );
    $params = [
        'model' => $ai['models'][$modelKey]['id'],
        'maxTokens' => 2048,
        'system' => $ai['system'],
        'tools' => $tools,
        'toolChoice' => ['type' => 'auto'],
        'messages' => $messages,
        'outputConfig' => ['effort' => 'low'],
        'cacheControl' => ['type' => 'ephemeral'],
    ];
    if ($modelKey === 'opus') {
        // Opus: bei einer Sicherheits-Ablehnung automatisch ein Ersatzmodell nehmen
        $params['fallbacks'] = 'default';
        $params['betas'] = ['server-side-fallback-2026-07-01'];
    }
    $response = $client->beta->messages->create(...$params);

    $stop = $response->stopReason;
    reply(200, [
        'content' => array_map(fn($b) => $b->jsonSerialize(), $response->content),
        'stop_reason' => $stop instanceof BackedEnum ? $stop->value : $stop,
        'model' => $response->model,
    ]);
} catch (BadRequestException $e) {
    // Meist: Gesprächsverlauf passt nicht mehr – die App beginnt dann ein neues Gespräch
    reply(400, ['error' => 'bad-request', 'message' => $e->getMessage()]);
} catch (AuthenticationException | PermissionDeniedException) {
    reply(502, ['error' => 'server-key', 'message' => 'Der API-Schlüssel auf dem Server ist ungültig.']);
} catch (RateLimitException) {
    reply(503, ['error' => 'busy', 'message' => 'Die KI ist gerade ausgelastet – versuch es gleich nochmal.']);
} catch (APIStatusException $e) {
    reply(502, ['error' => 'upstream', 'message' => 'KI-Fehler ' . ($e->status ?? '')]);
} catch (APIConnectionException) {
    reply(502, ['error' => 'upstream', 'message' => 'KI nicht erreichbar']);
} catch (Throwable $e) {
    error_log('Metal Detector KI: ' . $e->getMessage());
    reply(500, ['error' => 'server', 'message' => 'Interner Serverfehler']);
}

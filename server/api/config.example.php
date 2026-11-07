<?php
// Vorlage – die echte config.php erzeugt die automatische Veröffentlichung aus den GitHub-Secrets.
// Für einen manuellen Upload: als config.php speichern und ausfüllen. NIEMALS ins Git-Repository!
return [
    // API-Schlüssel von console.anthropic.com
    'anthropic_api_key' => '',
    // Nur diese Seiten dürfen den Server benutzen (ohne Schrägstrich am Ende)
    'allowed_origins' => ['https://www.deine-domain.de'],
    // Tageslimit für alle Nutzer zusammen: eine Haiku-Anfrage = 1, eine Opus-Anfrage = opus_cost
    'daily_budget' => 1000,
    'opus_cost' => 25,
    // Anfragen pro Minute und Nutzer
    'per_minute' => 20,
];

import Anthropic from "@anthropic-ai/sdk"
import { DurableObject } from "cloudflare:workers"
import { AI_LIMITS, AI_MODELS, AI_TOOLS, SYSTEM_PROMPT, type AiModelKey } from "../../lib/ai-tools"
import { researchBand, type BandResearch } from "./band-research"

/*
 * Metal Detector – KI-Server (Cloudflare Worker)
 *
 * Die App schickt hierher nur den Gesprächsverlauf und die Modellwahl.
 * Der Worker ergänzt den festen Auftrag (System-Prompt) und die Werkzeuge, hängt den
 * geheimen API-Schlüssel an und fragt Claude. So bleibt der Schlüssel geheim und der
 * Server lässt sich nicht für beliebige andere Zwecke nutzen.
 *
 * Schutz gegen hohe Kosten:
 *   - nur erlaubte Herkunft (deine App)
 *   - Begrenzung pro Nutzer (IP) und Minute
 *   - Tageslimit für alle Nutzer zusammen (Opus zählt teurer als Haiku)
 *   - kurze Antworten, begrenzte Gesprächslänge
 */

export interface Env {
  ANTHROPIC_API_KEY: string
  /** Nur für lokale Tests: anderer Anthropic-Server */
  ANTHROPIC_BASE_URL?: string
  ALLOWED_ORIGINS: string
  /** Tageslimit in "Einheiten": eine Haiku-Anfrage = 1, eine Opus-Anfrage = OPUS_COST */
  DAILY_BUDGET: string
  OPUS_COST: string
  /** Einheiten fürs Tageslimit pro KI-Bandsuche (Websuche kostet extra) */
  BAND_COST: string
  RATE_LIMITER: RateLimit
  BUDGET: DurableObjectNamespace<BudgetCounter>
  BAND_CACHE: DurableObjectNamespace<BandCache>
}

// ---------- Zwischenspeicher für KI-Bandsuchen (für alle Nutzer gemeinsam) ----------

const BAND_CACHE_DAYS = 30
const NOT_FOUND_CACHE_DAYS = 2

export class BandCache extends DurableObject {
  async read(key: string): Promise<BandResearch | null> {
    const entry = await this.ctx.storage.get<{ at: number; data: BandResearch }>(`band:${key}`)
    if (!entry) return null
    const maxAge = (entry.data.found ? BAND_CACHE_DAYS : NOT_FOUND_CACHE_DAYS) * 86400000
    if (Date.now() - entry.at > maxAge) {
      await this.ctx.storage.delete(`band:${key}`)
      return null
    }
    return entry.data
  }

  async write(key: string, data: BandResearch): Promise<void> {
    await this.ctx.storage.put(`band:${key}`, { at: Date.now(), data })
  }
}

const normalizeName = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")

// ---------- Tageslimit (ein einziger, zentraler Zähler) ----------

export class BudgetCounter extends DurableObject {
  async spend(units: number, limit: number): Promise<{ ok: boolean; used: number }> {
    const day = new Date().toISOString().slice(0, 10)
    const key = `used:${day}`
    const used = ((await this.ctx.storage.get<number>(key)) ?? 0) + units
    if (used > limit) return { ok: false, used: used - units }
    await this.ctx.storage.put(key, used)
    // Alte Tage aufräumen
    for (const k of (await this.ctx.storage.list({ prefix: "used:" })).keys()) {
      if (k !== key) await this.ctx.storage.delete(k)
    }
    return { ok: true, used }
  }
}

// ---------- Hilfsfunktionen ----------

const json = (body: unknown, status: number, headers: HeadersInit) =>
  new Response(JSON.stringify(body), { status, headers: { "Content-Type": "application/json", ...headers } })

function corsHeaders(origin: string | null, env: Env): Record<string, string> {
  const allowed = env.ALLOWED_ORIGINS.split(",").map((s) => s.trim())
  if (!origin || !allowed.includes(origin)) return {}
  return {
    "Access-Control-Allow-Origin": origin,
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
    "Access-Control-Max-Age": "86400",
    Vary: "Origin",
  }
}

const ALLOWED_BLOCKS = new Set(["text", "tool_use", "tool_result", "thinking", "redacted_thinking", "fallback"])

/** Prüft den Gesprächsverlauf, den die App schickt. Gibt eine Fehlermeldung zurück oder null. */
function validateMessages(messages: unknown): string | null {
  if (!Array.isArray(messages) || messages.length === 0) return "Keine Nachrichten"
  if (messages.length > AI_LIMITS.maxMessages + AI_LIMITS.maxToolRounds * 2 + 2) return "history-too-long"
  for (const [i, m] of messages.entries()) {
    if (!m || typeof m !== "object") return "Ungültige Nachricht"
    const { role, content } = m as { role?: unknown; content?: unknown }
    if (role !== "user" && role !== "assistant") return "Ungültige Rolle"
    if (i === 0 && role !== "user") return "Erste Nachricht muss vom Nutzer sein"
    if (typeof content === "string") {
      if (role === "user" && content.length > AI_LIMITS.maxUserChars + 300) return "Nachricht zu lang"
      continue
    }
    if (!Array.isArray(content) || content.length === 0) return "Ungültiger Inhalt"
    for (const block of content) {
      const type = (block as { type?: unknown })?.type
      if (typeof type !== "string" || !ALLOWED_BLOCKS.has(type)) return `Blocktyp nicht erlaubt: ${String(type)}`
      if (role === "user" && type === "text" && String((block as { text?: unknown }).text ?? "").length > AI_LIMITS.maxUserChars + 300)
        return "Nachricht zu lang"
    }
  }
  return null
}

// ---------- Hauptprogramm ----------

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const origin = request.headers.get("Origin")
    const cors = corsHeaders(origin, env)
    const url = new URL(request.url)

    if (request.method === "OPTIONS") return new Response(null, { status: cors["Access-Control-Allow-Origin"] ? 204 : 403, headers: cors })
    if (url.pathname === "/health") return json({ ok: true }, 200, cors)
    const isBand = url.pathname === "/band"
    if (request.method !== "POST" || !(isBand || ["/", "/chat", "/chat/"].includes(url.pathname))) return json({ error: "Nicht gefunden" }, 404, cors)
    if (!cors["Access-Control-Allow-Origin"]) return json({ error: "Herkunft nicht erlaubt" }, 403, {})
    if (!env.ANTHROPIC_API_KEY) return json({ error: "Server nicht eingerichtet (API-Schlüssel fehlt)" }, 500, cors)

    // 1. Begrenzung pro Nutzer
    const ip = request.headers.get("CF-Connecting-IP") ?? "unknown"
    const { success } = await env.RATE_LIMITER.limit({ key: ip })
    if (!success) return json({ error: "rate-limit", message: "Kurz durchatmen – zu viele Nachrichten in einer Minute." }, 429, cors)

    if (isBand) return handleBand(request, env, cors)

    // 2. Anfrage lesen und prüfen
    const raw = await request.text()
    if (raw.length > AI_LIMITS.maxPayloadChars + 20_000) return json({ error: "history-too-long" }, 413, cors)
    let body: { model?: string; messages?: unknown }
    try {
      body = JSON.parse(raw)
    } catch {
      return json({ error: "Ungültiges JSON" }, 400, cors)
    }
    const modelKey: AiModelKey = body.model === "opus" ? "opus" : "haiku"
    const problem = validateMessages(body.messages)
    if (problem) return json({ error: problem }, problem === "history-too-long" ? 413 : 400, cors)

    // 3. Tageslimit für alle zusammen
    const units = modelKey === "opus" ? Number(env.OPUS_COST || 20) : 1
    const budget = env.BUDGET.get(env.BUDGET.idFromName("global"))
    const spent = await budget.spend(units, Number(env.DAILY_BUDGET || 1000))
    if (!spent.ok) {
      return json({ error: "daily-limit", message: "Das KI-Tageslimit ist erreicht – morgen geht's weiter. Bis dahin antworte ich ohne KI." }, 429, cors)
    }

    // 4. Claude fragen
    const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined, maxRetries: 1 })
    const isOpus = modelKey === "opus"
    try {
      const response = await client.beta.messages.create({
        model: AI_MODELS[modelKey].id,
        max_tokens: 2048,
        system: SYSTEM_PROMPT,
        tools: AI_TOOLS as Anthropic.Beta.BetaToolUnion[],
        tool_choice: { type: "auto" },
        messages: body.messages as Anthropic.Beta.BetaMessageParam[],
        output_config: { effort: "low" },
        cache_control: { type: "ephemeral" },
        // Opus: bei einer Sicherheits-Ablehnung automatisch ein Ersatzmodell nehmen
        ...(isOpus ? { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" as const } : {}),
      })
      return json({ content: response.content, stop_reason: response.stop_reason, model: response.model }, 200, cors)
    } catch (error) {
      return apiError(error, cors)
    }
  },
} satisfies ExportedHandler<Env>

function apiError(error: unknown, cors: Record<string, string>): Response {
  if (error instanceof Anthropic.BadRequestError) {
    // Meist: Gesprächsverlauf passt nicht mehr – die App beginnt dann ein neues Gespräch
    return json({ error: "bad-request", message: error.message }, 400, cors)
  }
  if (error instanceof Anthropic.AuthenticationError || error instanceof Anthropic.PermissionDeniedError) {
    return json({ error: "server-key", message: "Der API-Schlüssel auf dem Server ist ungültig." }, 502, cors)
  }
  if (error instanceof Anthropic.RateLimitError) {
    return json({ error: "busy", message: "Die KI ist gerade ausgelastet – versuch es gleich nochmal." }, 503, cors)
  }
  if (error instanceof Anthropic.APIError) {
    return json({ error: "upstream", message: `KI-Fehler ${error.status ?? ""}` }, 502, cors)
  }
  return json({ error: "upstream", message: "KI nicht erreichbar" }, 502, cors)
}

// ---------- KI-Bandsuche ----------

async function handleBand(request: Request, env: Env, cors: Record<string, string>): Promise<Response> {
  let name = ""
  try {
    const body = (await request.json()) as { name?: unknown }
    name = typeof body.name === "string" ? body.name.trim() : ""
  } catch {
    return json({ error: "Ungültiges JSON" }, 400, cors)
  }
  if (!name || name.length > 80) return json({ error: "Ungültiger Bandname" }, 400, cors)
  const key = normalizeName(name)
  if (!key) return json({ error: "Ungültiger Bandname" }, 400, cors)

  // Schon einmal recherchiert? Dann kostenlos aus dem Zwischenspeicher
  const cache = env.BAND_CACHE.get(env.BAND_CACHE.idFromName("global"))
  const cached = await cache.read(key)
  if (cached) return json({ ...cached, cached: true }, 200, cors)

  const budget = env.BUDGET.get(env.BUDGET.idFromName("global"))
  const spent = await budget.spend(Number(env.BAND_COST || 20), Number(env.DAILY_BUDGET || 1000))
  if (!spent.ok) return json({ error: "daily-limit", message: "Das KI-Tageslimit ist erreicht." }, 429, cors)

  const client = new Anthropic({ apiKey: env.ANTHROPIC_API_KEY, baseURL: env.ANTHROPIC_BASE_URL || undefined, maxRetries: 1 })
  try {
    const result = await researchBand(client, name)
    // Nur speichern, wenn wirklich etwas Brauchbares herauskam (oder sicher nichts existiert)
    if (!result.found || Object.keys(result.profile).length >= 5) await cache.write(key, result)
    return json({ ...result, cached: false }, 200, cors)
  } catch (error) {
    if (error instanceof Error && (error.message === "refusal" || error.message === "no-result")) {
      return json({ error: "no-result", message: "Die KI konnte zu dieser Band nichts Verlässliches finden." }, 502, cors)
    }
    return apiError(error, cors)
  }
}

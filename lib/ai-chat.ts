import type { BandInfo } from "./bands"
import { findBand } from "./band-source"
import { bandGenres, genreRecommendations, rankGenres, type ChatAction, type LastBand } from "./chat"
import { AI_LIMITS, AI_MODELS, type AiModelKey } from "./ai-tools"
import { calculateMatch } from "./match"
import { getPropertyLabel, type ProfileKey, type UserProfile } from "./profile"
import { apiPause, searchByGenre, type GenreBand } from "./web-lookup"
import {
  addToWatchlist,
  findOnWatchlist,
  removeFromWatchlist,
  type WatchItem,
} from "./watchlist"

/*
 * KI-Chat: schickt das Gespräch an den Metal-Detector-Server (Cloudflare Worker),
 * führt die Werkzeuge aus, die Claude anfordert, und gibt die Antwort zurück.
 * Der Gesprächsverlauf wird nur angehängt, nie nachträglich verändert –
 * das verlangt die API, damit Claudes Denk-Blöcke gültig bleiben.
 */

export const AI_URL = (process.env.NEXT_PUBLIC_AI_URL || "").replace(/\/+$/, "")
export const aiAvailable = () => AI_URL.length > 0

// Inhalte kommen 1:1 von der API zurück und werden unverändert wieder mitgeschickt
type Block = { type: string; [key: string]: unknown }
type AiMessage = { role: "user" | "assistant"; content: Block[] }

export type AiDeps = {
  getProfile: () => UserProfile
  applyProfile: (profile: UserProfile) => void
  getWatchlist: () => WatchItem[]
  setWatchlist: (list: WatchItem[]) => void
  /** Band in der Ampel anzeigen */
  showBand: (name: string, info: BandInfo) => void
  getLastBand: () => LastBand
}

export type AiReply = { text: string; actions: ChatAction[]; model: string; newConversation: boolean }

export class AiError extends Error {
  constructor(message: string, public code: string) {
    super(message)
  }
}

// ---------- Settings ----------

const MODEL_KEY = "metal-detector-ai-model"
export type AiSetting = AiModelKey | "off"

export function loadAiSetting(): AiSetting {
  try {
    const v = localStorage.getItem(MODEL_KEY)
    return v === "opus" || v === "off" || v === "haiku" ? v : "haiku"
  } catch {
    return "haiku"
  }
}

export function saveAiSetting(v: AiSetting) {
  try {
    localStorage.setItem(MODEL_KEY, v)
  } catch {
    /* egal */
  }
}

// ---------- Werkzeuge ----------

type ToolOutput = { result: unknown; actions?: ChatAction[]; isError?: boolean }

const ratingLabel = (r: string | null) =>
  r === "green" ? "passt (grün)" : r === "yellow" ? "könnte passen (gelb)" : r === "red" ? "eher nicht (rot)" : "keine Bewertung"

function bandSummary(name: string, info: BandInfo, profile: UserProfile) {
  const m = calculateMatch(name, info, profile)
  const keys = Object.keys(info.profile) as ProfileKey[]
  const rows = keys.map((k) => ({ k, band: info.profile[k]!, you: profile[k], diff: Math.abs(info.profile[k]! - profile[k]) }))
  const fmt = (r: (typeof rows)[number]) => `${getPropertyLabel(r.k)}: Band ${r.band}, Nutzer ${r.you}`
  const liveKeys: ProfileKey[] = ["liveEnergie", "moshpitFaktor", "publikumsenergie", "buehnenpraesenz", "publikumsinteraktion", "festivalTauglichkeit"]
  return {
    name,
    genres: bandGenres(info),
    origin: info.lyricStyle || undefined,
    description: info.description,
    themes: info.themes,
    match_percent: m.rating ? m.matchPercentage : null,
    rating: ratingLabel(m.rating),
    good_matches: rows.filter((r) => r.diff <= 2 && Math.max(r.band, r.you) >= 7).slice(0, 6).map(fmt),
    mismatches: rows.filter((r) => r.diff >= 4).sort((a, b) => b.diff - a.diff).slice(0, 6).map(fmt),
    live: Object.fromEntries(liveKeys.filter((k) => info.profile[k] !== undefined).map((k) => [getPropertyLabel(k), info.profile[k]])),
    spotify: info.spotify,
    data_source: info.source ? "Web (geschätzt aus Genres und Wikipedia)" : "eingebaute Liste",
  }
}

async function loadBand(name: string, deps: AiDeps): Promise<{ name: string; info: BandInfo } | string> {
  const last = deps.getLastBand()
  if (last && last.name.toLowerCase() === name.trim().toLowerCase()) return last
  const found = await findBand(name)
  if (found.ok) return { name: found.name, info: found.info }
  return found.reason === "offline" ? `Web nicht erreichbar (${found.message})` : `Band "${name}" nicht gefunden`
}

const bandChip = (name: string): ChatAction => ({ label: `🎸 ${name}`, type: "band", value: name })

async function runTool(name: string, input: Record<string, unknown>, deps: AiDeps): Promise<ToolOutput> {
  const profile = deps.getProfile()
  switch (name) {
    case "analyze_band": {
      const band = await loadBand(String(input.name ?? ""), deps)
      if (typeof band === "string") return { result: band, isError: true }
      deps.showBand(band.name, band.info)
      return {
        result: bandSummary(band.name, band.info, profile),
        actions: [
          { label: `❤️ ${band.name} merken`, type: "watch", value: band.name },
          { label: "🎧 Spotify", type: "link", value: band.info.spotify },
        ],
      }
    }
    case "find_similar_bands": {
      const band = await loadBand(String(input.name ?? ""), deps)
      if (typeof band === "string") return { result: band, isError: true }
      const genres = bandGenres(band.info).slice(0, 2)
      const bands: GenreBand[] = []
      for (const [i, g] of genres.entries()) {
        if (i > 0) await apiPause()
        bands.push(...(await searchByGenre(g, 5, [band.name, ...bands.map((b) => b.name)])))
      }
      return { result: { based_on: band.name, genres, similar_bands: bands }, actions: bands.slice(0, 6).map((b) => bandChip(b.name)) }
    }
    case "recommend_bands": {
      const out = (await genreRecommendations(profile)).map((r) => ({ genre: r.genre, genre_match_percent: r.percent, bands: r.bands }))
      const neutral = Object.values(profile).every((v) => v === 5)
      return {
        result: { profile_is_still_neutral: neutral, recommendations: out },
        actions: out.flatMap((o) => o.bands).slice(0, 8).map((b) => bandChip(b.name)),
      }
    }
    case "bands_by_genre": {
      const bands = await searchByGenre(String(input.genre ?? "").toLowerCase(), 8)
      return { result: { genre: input.genre, bands }, actions: bands.slice(0, 6).map((b) => bandChip(b.name)) }
    }
    case "get_user_profile": {
      const values = Object.fromEntries((Object.keys(profile) as ProfileKey[]).map((k) => [`${k} (${getPropertyLabel(k)})`, profile[k]]))
      return {
        result: {
          profile_is_still_neutral: Object.values(profile).every((v) => v === 5),
          values,
          best_genres: rankGenres(profile).slice(0, 5),
        },
      }
    }
    case "update_user_profile": {
      const changes = Array.isArray(input.changes) ? (input.changes as { property: string; value: number }[]) : []
      const next = { ...profile }
      const done: string[] = []
      for (const c of changes) {
        if (!(c.property in profile)) continue
        const key = c.property as ProfileKey
        const value = Math.max(0, Math.min(10, Math.round(Number(c.value))))
        if (Number.isNaN(value)) continue
        done.push(`${getPropertyLabel(key)}: ${profile[key]} → ${value}`)
        next[key] = value
      }
      if (done.length === 0) return { result: "Keine gültigen Änderungen", isError: true }
      deps.applyProfile(next)
      return { result: { changed: done }, actions: [{ label: "↩️ Profiländerung rückgängig", type: "undo", value: "" }] }
    }
    case "watchlist_get": {
      const list = deps.getWatchlist()
      return {
        result: list.map((i) => {
          const m = calculateMatch(i.name, i.info, profile)
          return { name: i.name, genre: i.info.genre, match_percent: m.rating ? m.matchPercentage : null, listened: i.listened }
        }),
      }
    }
    case "watchlist_add": {
      const band = await loadBand(String(input.name ?? ""), deps)
      if (typeof band === "string") return { result: band, isError: true }
      const list = deps.getWatchlist()
      if (findOnWatchlist(list, band.name)) return { result: `${band.name} steht schon auf der Merkliste` }
      deps.setWatchlist(addToWatchlist(list, band.name, band.info))
      return { result: `${band.name} wurde auf die Merkliste gesetzt` }
    }
    case "watchlist_remove": {
      const list = deps.getWatchlist()
      const item = findOnWatchlist(list, String(input.name ?? ""))
      if (!item) return { result: `${input.name} steht nicht auf der Merkliste`, isError: true }
      deps.setWatchlist(removeFromWatchlist(list, item.name))
      return { result: `${item.name} wurde von der Merkliste entfernt` }
    }
    case "watchlist_mark_listened": {
      const list = deps.getWatchlist()
      const item = findOnWatchlist(list, String(input.name ?? ""))
      if (!item) return { result: `${input.name} steht nicht auf der Merkliste`, isError: true }
      const listened = Boolean(input.listened)
      deps.setWatchlist(list.map((i) => (i.name === item.name ? { ...i, listened } : i)))
      return { result: `${item.name} ist jetzt als ${listened ? "angehört" : "nicht angehört"} markiert` }
    }
    default:
      return { result: `Unbekanntes Werkzeug: ${name}`, isError: true }
  }
}

// ---------- Gespräch ----------

export class AiChat {
  private history: AiMessage[] = []
  private lastBandSent: string | null = null

  reset() {
    this.history = []
    this.lastBandSent = null
  }

  private tooLong() {
    return this.history.length >= AI_LIMITS.maxMessages || JSON.stringify(this.history).length > AI_LIMITS.maxPayloadChars
  }

  private async call(model: AiModelKey): Promise<{ content: Block[]; stop_reason: string | null; model: string }> {
    let res: Response
    try {
      res = await fetch(`${AI_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ model, messages: this.history }),
      })
    } catch {
      throw new AiError("KI-Server nicht erreichbar", "network")
    }
    const data = await res.json().catch(() => ({}))
    if (!res.ok) throw new AiError(data.message || data.error || `Fehler ${res.status}`, data.error || String(res.status))
    return data
  }

  async send(text: string, model: AiModelKey, deps: AiDeps): Promise<AiReply> {
    try {
      return await this.exchange(text, model, deps)
    } finally {
      // Was die KI selbst angezeigt hat, muss ihr beim nächsten Mal nicht erklärt werden
      this.lastBandSent = deps.getLastBand()?.name ?? this.lastBandSent
    }
  }

  private async exchange(text: string, model: AiModelKey, deps: AiDeps): Promise<AiReply> {
    let newConversation = false
    if (this.tooLong()) {
      this.reset()
      newConversation = true
    }

    // Wenn der Nutzer zwischendurch ohne KI eine Band angeschaut hat, sagen wir das der KI
    const last = deps.getLastBand()
    let userText = text.slice(0, AI_LIMITS.maxUserChars)
    if (last && last.name !== this.lastBandSent) {
      userText = `[Info der App: Zuletzt angezeigte Band ist "${last.name}".]\n${userText}`
    }
    this.lastBandSent = last?.name ?? this.lastBandSent

    const start = this.history.length
    this.history.push({ role: "user", content: [{ type: "text", text: userText }] })
    const actions: ChatAction[] = []
    let retried = false

    for (let round = 0; round <= AI_LIMITS.maxToolRounds; round++) {
      let res
      try {
        res = await this.call(model)
      } catch (e) {
        // Gesprächsverlauf vom Server abgelehnt → einmal mit frischem Gespräch probieren
        if (e instanceof AiError && (e.code === "bad-request" || e.code === "history-too-long") && !retried) {
          retried = true
          this.reset()
          newConversation = true
          this.history.push({ role: "user", content: [{ type: "text", text: text.slice(0, AI_LIMITS.maxUserChars) }] })
          round--
          continue
        }
        // Angefangenen Austausch wieder entfernen (nur am Ende – frühere Teile bleiben unverändert)
        this.history.length = start
        throw e
      }

      if (res.stop_reason === "refusal" || res.content.length === 0) {
        this.history.length = start
        return { text: "Dazu kann ich leider nichts sagen 🙅 Lass uns lieber über Musik reden!", actions, model: res.model, newConversation }
      }

      this.history.push({ role: "assistant", content: res.content })

      const toolUses = res.content.filter((b) => b.type === "tool_use") as (Block & { id: string; name: string; input: Record<string, unknown> })[]
      if (res.stop_reason !== "tool_use" || toolUses.length === 0) {
        const answer = res.content
          .filter((b) => b.type === "text")
          .map((b) => String(b.text ?? ""))
          .join("\n\n")
          .trim()
        return { text: answer || "🤘", actions: dedupe(actions), model: res.model, newConversation }
      }

      // Werkzeuge nacheinander ausführen (schont die Wikimedia-Server)
      const results: Block[] = []
      const lastRound = round === AI_LIMITS.maxToolRounds
      for (const t of toolUses) {
        if (lastRound) {
          results.push({ type: "tool_result", tool_use_id: t.id, content: "Abgebrochen: zu viele Werkzeug-Aufrufe", is_error: true })
          continue
        }
        try {
          const out = await runTool(t.name, t.input ?? {}, deps)
          if (out.actions) actions.push(...out.actions)
          results.push({
            type: "tool_result",
            tool_use_id: t.id,
            content: typeof out.result === "string" ? out.result : JSON.stringify(out.result),
            ...(out.isError ? { is_error: true } : {}),
          })
        } catch (e) {
          results.push({
            type: "tool_result",
            tool_use_id: t.id,
            content: `Fehler: ${e instanceof Error ? e.message : "unbekannt"} (vermutlich keine Internetverbindung)`,
            is_error: true,
          })
        }
      }
      this.history.push({ role: "user", content: results })
      if (lastRound) {
        const partial = res.content.filter((b) => b.type === "text").map((b) => String(b.text ?? "")).join("\n\n").trim()
        return { text: partial || "Das war mir gerade zu viel auf einmal 😅 Frag mich bitte etwas einfacher.", actions: dedupe(actions), model: res.model, newConversation }
      }
    }
    throw new AiError("Unerwartetes Ende", "loop")
  }
}

function dedupe(actions: ChatAction[]) {
  const seen = new Set<string>()
  return actions.filter((a) => {
    const k = `${a.type}:${a.value}:${a.label}`
    if (seen.has(k)) return false
    seen.add(k)
    return true
  })
}

export const modelLabel = (id: string) =>
  Object.values(AI_MODELS).find((m) => id.startsWith(m.id))?.label ?? id

import Anthropic from "@anthropic-ai/sdk"
import { profileSections } from "../../lib/profile"

/*
 * KI-Bandsuche: Für Bands, die Wikipedia/Wikidata nicht kennen, recherchiert Claude Haiku
 * im Web (höchstens 3 Suchen) und füllt das Profil der App aus.
 * Das Ergebnis kommt über das Werkzeug "submit_band_profile" mit festem Schema zurück.
 */

export const RESEARCH_MODEL = "claude-haiku-5-5"
const MAX_SEARCHES = 3
const MAX_ROUNDS = 3

const sliders = profileSections.flatMap((s) => s.sliders)
const PROFILE_KEYS = sliders.map((s) => s.key)

export type BandResearch = {
  found: boolean
  name: string
  country: string
  since: string
  genres: string[]
  description: string
  themes: string[]
  spotify_url: string
  profile: Record<string, number>
  sources: { title: string; url: string }[]
}

const SYSTEM = `You research bands and music artists (mostly metal and rock) for a German music app.

Given a name, use web_search (at most ${MAX_SEARCHES} searches) to find reliable information: official sites, Bandcamp, Metal Archives, interviews, reviews, label pages. Then call submit_band_profile exactly once.

Rules:
- If several artists share the name, choose the metal/rock one. If you cannot find a band or artist with this name at all, call submit_band_profile with found=false and empty or -1 values.
- Never invent facts. If you are unsure about something, leave text fields empty and use -1 for profile values.
- description: 1-3 short sentences in German (origin, style, what makes them special).
- country: German country name (e.g. "Schweden"), or "".
- since: year the band started, or "".
- genres: up to 5 genres in English, lowercase (e.g. "melodic death metal", "metalcore").
- themes: up to 6 lyrical themes in German.
- spotify_url: only an open.spotify.com/artist/... link you actually saw, otherwise "".
- profile: rate each property 0-10 for how strongly it describes this band (0 = not at all, 5 = somewhat, 10 = defining). Use -1 only if you have no basis at all. Be careful with ideology: rate satanic symbolism, blasphemy, anti-religion, occultism or Christian themes high only if sources support it; a dark image alone is not satanism.

Profile properties:
${sliders.map((s) => `- ${s.key}: ${s.label}${s.question ? ` (${s.question})` : ""}`).join("\n")}`

const SUBMIT_TOOL = {
  name: "submit_band_profile",
  description: "Submit the researched band profile. Call exactly once at the end.",
  strict: true,
  input_schema: {
    type: "object",
    additionalProperties: false,
    required: ["found", "name", "country", "since", "genres", "description", "themes", "spotify_url", "profile"],
    properties: {
      found: { type: "boolean", description: "false if no band/artist with this name could be found" },
      name: { type: "string", description: "Official spelling of the name" },
      country: { type: "string" },
      since: { type: "string" },
      genres: { type: "array", items: { type: "string" } },
      description: { type: "string" },
      themes: { type: "array", items: { type: "string" } },
      spotify_url: { type: "string" },
      profile: {
        type: "object",
        additionalProperties: false,
        required: PROFILE_KEYS,
        properties: Object.fromEntries(PROFILE_KEYS.map((k) => [k, { type: "integer", description: "0-10, or -1 if unknown" }])),
      },
    },
  },
}

type Block = { type: string; [key: string]: unknown }

function collectSources(content: Block[], into: Map<string, string>) {
  for (const block of content) {
    if (block.type !== "web_search_tool_result" || !Array.isArray(block.content)) continue
    for (const r of block.content as { url?: string; title?: string }[]) {
      if (r.url && !into.has(r.url)) into.set(r.url, r.title ?? r.url)
    }
  }
}

function clean(input: Record<string, unknown>, sources: Map<string, string>): BandResearch {
  const str = (v: unknown, max = 400) => (typeof v === "string" ? v.trim().slice(0, max) : "")
  const list = (v: unknown, n: number) =>
    Array.isArray(v) ? v.filter((x): x is string => typeof x === "string" && x.trim() !== "").map((x) => x.trim().slice(0, 60)).slice(0, n) : []
  const rawProfile = (input.profile ?? {}) as Record<string, unknown>
  const profile: Record<string, number> = {}
  for (const key of PROFILE_KEYS) {
    const v = Number(rawProfile[key])
    if (Number.isFinite(v) && v >= 0) profile[key] = Math.max(0, Math.min(10, Math.round(v)))
  }
  const spotify = str(input.spotify_url)
  return {
    found: input.found === true,
    name: str(input.name, 80),
    country: str(input.country, 40),
    since: str(input.since, 10),
    genres: list(input.genres, 5).map((g) => g.toLowerCase()),
    description: str(input.description, 500),
    themes: list(input.themes, 6),
    spotify_url: /^https:\/\/open\.spotify\.com\/artist\/[A-Za-z0-9]+/.test(spotify) ? spotify : "",
    profile,
    sources: [...sources].slice(0, 6).map(([url, title]) => ({ url, title: title.slice(0, 100) })),
  }
}

export async function researchBand(client: Anthropic, name: string): Promise<BandResearch> {
  const messages: Anthropic.Beta.BetaMessageParam[] = [{ role: "user", content: `Band/Künstler: "${name}"` }]
  const sources = new Map<string, string>()

  for (let round = 0; round < MAX_ROUNDS; round++) {
    const response = await client.beta.messages.create({
      model: RESEARCH_MODEL,
      max_tokens: 4096,
      system: SYSTEM,
      tools: [
        { type: "web_search_20250305", name: "web_search", max_uses: MAX_SEARCHES },
        SUBMIT_TOOL,
      ] as Anthropic.Beta.BetaToolUnion[],
      tool_choice: { type: "auto" },
      messages,
      output_config: { effort: "low" },
    })
    const content = response.content as unknown as Block[]
    collectSources(content, sources)

    const submit = content.find((b) => b.type === "tool_use" && b.name === "submit_band_profile")
    if (submit) return clean((submit.input ?? {}) as Record<string, unknown>, sources)

    if (response.stop_reason === "refusal") throw new Error("refusal")
    // Lange Suche pausiert: Antwort unverändert zurückschicken, dann geht es weiter
    messages.push({ role: "assistant", content: response.content as unknown as Anthropic.Beta.BetaContentBlockParam[] })
    if (response.stop_reason !== "pause_turn") {
      messages.push({ role: "user", content: "Bitte ruf jetzt submit_band_profile mit deinen Ergebnissen auf." })
    }
  }
  throw new Error("no-result")
}

import type { BandInfo } from "./bands"
import { AI_URL, aiAvailable, loadAiSetting } from "./ai-chat"
import type { UserProfile } from "./profile"
import { cacheBand, profileFromGenres } from "./web-lookup"

/*
 * KI-Bandsuche: Kennt Wikipedia/Wikidata eine Band nicht, recherchiert der KI-Server sie im Web.
 * Nur aktiv, wenn der KI-Server eingerichtet und der KI-Chat nicht ausgeschaltet ist.
 */

type Research = {
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
  cached?: boolean
}

export type AiBandResult = { status: "found"; band: BandInfo } | { status: "not-found" } | { status: "unavailable"; message?: string }

export const aiBandLookupEnabled = () => aiAvailable() && loadAiSetting() !== "off"

/** Adresse der Bandsuche neben dem Chat-Endpunkt: https://…workers.dev → https://…workers.dev/band */
const bandUrl = () => `${AI_URL.replace(/\/(chat\/?)?$/, "")}/band`

export async function aiBandLookup(query: string): Promise<AiBandResult> {
  if (!aiBandLookupEnabled()) return { status: "unavailable" }
  let data: Research & { error?: string; message?: string }
  try {
    const res = await fetch(bandUrl(), {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: query.trim().slice(0, 80) }),
    })
    data = await res.json()
    if (!res.ok) return data.error === "no-result" ? { status: "not-found" } : { status: "unavailable", message: data.message }
  } catch {
    return { status: "unavailable", message: "KI-Server nicht erreichbar" }
  }
  if (!data.found) return { status: "not-found" }

  // Genre-Regeln als Grundlage, die Einschätzung der KI hat Vorrang
  const profile: Partial<UserProfile> = { ...profileFromGenres(data.genres), ...(data.profile as Partial<UserProfile>) }
  if (Object.keys(profile).length === 0) return { status: "not-found" }

  const name = data.name || query
  const band: BandInfo = {
    name,
    genre: data.genres[0] || "unbekannt",
    subgenre: data.genres.slice(1).join(", ") || undefined,
    attitude: "",
    religion: "",
    themes: data.themes,
    spotify: data.spotify_url || `https://open.spotify.com/search/${encodeURIComponent(name)}`,
    description: data.description || "Per KI-Websuche recherchiert.",
    lyricStyle: [data.country, data.since ? `seit ${data.since}` : ""].filter(Boolean).join(", "),
    profile,
    source: {
      kind: "ai",
      webSources: data.sources,
      tagCount: data.genres.length,
      lyricSentences: 0,
    },
  }
  cacheBand(query, band)
  return { status: "found", band }
}

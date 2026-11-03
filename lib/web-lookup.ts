import type { BandInfo } from "./bands"
import type { UserProfile } from "./profile"
import { genreRules, overrideRules, themeKeywords } from "./genre-rules"

/*
 * Holt Band-Infos kostenlos aus dem Web:
 *   1. MusicBrainz  → Band finden, Genres/Tags, Land, Spotify-Link, Wikidata-ID
 *   2. Wikidata     → passende Wikipedia-Artikel (deutsch + englisch)
 *   3. Wikipedia    → deutsche Kurzbeschreibung + englischer Artikel für Textthemen
 * Daraus wird mit den Regeln aus genre-rules.ts ein Profil geschätzt.
 */

const MB = "https://musicbrainz.org/ws/2"
const CACHE_KEY = "metal-detector-web-cache-v1"
const CACHE_DAYS = 30

type MbTag = { name: string; count?: number }
type MbArtist = {
  id: string
  name: string
  score?: number
  type?: string
  country?: string
  disambiguation?: string
  "life-span"?: { begin?: string; end?: string; ended?: boolean }
  tags?: MbTag[]
  genres?: MbTag[]
  relations?: { type: string; url?: { resource: string } }[]
}

export type WebBandResult =
  | { status: "found"; band: BandInfo }
  | { status: "not-found" }
  | { status: "error"; message: string }

// ---------- kleine Helfer ----------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJson<T>(url: string, retries = 2): Promise<T> {
  const res = await fetch(url, { headers: { Accept: "application/json" } })
  // MusicBrainz erlaubt ca. 1 Anfrage pro Sekunde – bei 503 kurz warten und nochmal
  if ((res.status === 503 || res.status === 429) && retries > 0) {
    await sleep(1200)
    return getJson<T>(url, retries - 1)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")

const isMetalish = (tags: MbTag[] = []) =>
  tags.some((t) => /metal|core|rock|grind|doom|sludge|djent|punk/.test(t.name.toLowerCase()))

const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)))

// ---------- 1. MusicBrainz ----------

async function findArtist(query: string): Promise<MbArtist | null> {
  const q = encodeURIComponent(`artist:"${query.replace(/"/g, "")}"`)
  const data = await getJson<{ artists: MbArtist[] }>(`${MB}/artist/?query=${q}&fmt=json&limit=10`)
  const candidates = (data.artists || []).filter((a) => (a.score ?? 0) >= 70)
  if (candidates.length === 0) return null

  const wanted = normalize(query)
  // Bewertung: exakter Name > Metal-Tags > Anzahl Tags > MusicBrainz-Score
  const rank = (a: MbArtist) =>
    (normalize(a.name) === wanted ? 1000 : 0) +
    (isMetalish(a.tags) ? 500 : 0) +
    Math.min((a.tags || []).reduce((s, t) => s + (t.count ?? 1), 0), 100) +
    (a.score ?? 0)

  return [...candidates].sort((a, b) => rank(b) - rank(a))[0]
}

async function getArtistDetails(id: string): Promise<MbArtist> {
  await sleep(1100) // Rate-Limit von MusicBrainz einhalten
  return getJson<MbArtist>(`${MB}/artist/${id}?inc=genres+tags+url-rels&fmt=json`)
}

// ---------- 2. + 3. Wikidata / Wikipedia ----------

async function getWikiTitles(artist: MbArtist): Promise<{ en?: string; de?: string }> {
  const wd = artist.relations?.find((r) => r.type === "wikidata")?.url?.resource
  const qid = wd?.match(/Q\d+/)?.[0]
  if (qid) {
    try {
      const data = await getJson<{ entities: Record<string, { sitelinks?: Record<string, { title: string }> }> }>(
        `https://www.wikidata.org/w/api.php?action=wbgetentities&ids=${qid}&props=sitelinks&sitefilter=enwiki|dewiki&format=json&origin=*`
      )
      const links = data.entities?.[qid]?.sitelinks || {}
      return { en: links.enwiki?.title, de: links.dewiki?.title }
    } catch {
      /* weiter mit Suche */
    }
  }
  // Kein Wikidata-Link → englische Wikipedia direkt durchsuchen
  try {
    const data = await getJson<{ query: { search: { title: string }[] } }>(
      `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(
        `${artist.name} band`
      )}&srlimit=1&format=json&origin=*`
    )
    const title = data.query?.search?.[0]?.title
    if (title && normalize(title).includes(normalize(artist.name))) return { en: title }
  } catch {
    /* ohne Wikipedia weitermachen */
  }
  return {}
}

async function getEnglishArticle(title: string): Promise<string> {
  const data = await getJson<{ query: { pages: { extract?: string }[] } }>(
    `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&explaintext=1&redirects=1&formatversion=2&titles=${encodeURIComponent(
      title
    )}&format=json&origin=*`
  )
  return data.query?.pages?.[0]?.extract || ""
}

async function getSummary(lang: "de" | "en", title: string): Promise<{ text: string; url: string } | null> {
  try {
    const data = await getJson<{ extract?: string; content_urls?: { desktop?: { page?: string } } }>(
      `https://${lang}.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(title.replace(/ /g, "_"))}`
    )
    if (!data.extract) return null
    return { text: data.extract, url: data.content_urls?.desktop?.page || "" }
  } catch {
    return null
  }
}

// ---------- Profil berechnen ----------

const wordRegex = (w: string) => {
  const esc = w.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")
  // kurze Wörter nur als ganzes Wort (sonst trifft "war" auch "warm"), lange auch als Wortanfang
  return w.length < 5 ? new RegExp(`\\b${esc}s?\\b`, "g") : new RegExp(`\\b${esc}`, "g")
}

// Sätze, die etwas über Texte/Themen aussagen
const LYRIC_CONTEXT = /lyric|theme|thematic|concept|subject matter|inspired by|deals? with|dealing with|focus(es|ed)? on|topics?|imagery|message|songs? about|album about|sings? about|writes? about|ideolog|beliefs?/i

function analyzeText(article: string) {
  const sentences = article.split(/(?<=[.!?])\s+/).filter((s) => LYRIC_CONTEXT.test(s))
  const text = sentences.join(" ").toLowerCase()
  const values: Partial<UserProfile> = {}
  const found: string[] = []

  for (const group of themeKeywords) {
    const hits = group.words.reduce((n, w) => n + (text.match(wordRegex(w))?.length ?? 0), 0)
    if (hits === 0) continue
    const v = hits >= 5 ? 10 : hits >= 3 ? 9 : hits === 2 ? 8 : 7
    for (const k of group.keys) values[k] = Math.max(values[k] ?? 0, v)
    found.push(group.label)
  }
  return { values, found, sentenceCount: sentences.length }
}

function profileFromTags(tags: MbTag[]) {
  const sums: Record<string, { total: number; weight: number }> = {}
  const matched = new Set<string>()

  for (const tag of tags) {
    const name = tag.name.toLowerCase()
    const weight = Math.max(tag.count ?? 1, 1)
    for (const rule of genreRules) {
      if (!new RegExp(`(^|[^a-z])${rule.match.replace(/[-]/g, "[- ]?")}`).test(name)) continue
      matched.add(rule.match)
      for (const [k, v] of Object.entries(rule.values)) {
        sums[k] ??= { total: 0, weight: 0 }
        sums[k].total += (v as number) * weight
        sums[k].weight += weight
      }
    }
  }

  const values: Partial<UserProfile> = {}
  for (const [k, { total, weight }] of Object.entries(sums)) {
    values[k as keyof UserProfile] = clamp(total / weight)
  }

  // Überschreibende Regeln (z. B. christlich) zuletzt anwenden
  for (const rule of overrideRules) {
    if (tags.some((t) => t.name.toLowerCase().includes(rule.match))) {
      Object.assign(values, rule.values)
      matched.add(rule.match)
    }
  }
  return { values, matched: [...matched] }
}

// ---------- Cache ----------

type CacheEntry = { at: number; band: BandInfo }

function readCache(): Record<string, CacheEntry> {
  try {
    return JSON.parse(localStorage.getItem(CACHE_KEY) || "{}")
  } catch {
    return {}
  }
}

function writeCache(key: string, band: BandInfo) {
  try {
    const cache = readCache()
    cache[key] = { at: Date.now(), band }
    localStorage.setItem(CACHE_KEY, JSON.stringify(cache))
  } catch {
    /* Speicher voll oder gesperrt – egal */
  }
}

export function getCachedBand(query: string): BandInfo | null {
  const entry = readCache()[normalize(query)]
  if (!entry) return null
  if (Date.now() - entry.at > CACHE_DAYS * 86400000) return null
  return entry.band
}

/** Alle bisher gesuchten Bands (für Suchvorschläge) */
export function getCachedBandNames(): string[] {
  return Object.values(readCache())
    .sort((a, b) => b.at - a.at)
    .map((e) => e.band.name || "")
    .filter(Boolean)
}

// ---------- Hauptfunktion ----------

export async function lookupBand(query: string): Promise<WebBandResult> {
  const cached = getCachedBand(query)
  if (cached) return { status: "found", band: cached }

  let artist: MbArtist | null
  try {
    artist = await findArtist(query)
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Netzwerkfehler" }
  }
  if (!artist) return { status: "not-found" }

  let details: MbArtist = artist
  try {
    details = await getArtistDetails(artist.id)
  } catch {
    /* mit den Suchdaten weitermachen */
  }

  // Genres (kuratiert) zählen doppelt, Tags (von Nutzern) einfach
  const tags: MbTag[] = [
    ...(details.genres || []).map((g) => ({ name: g.name, count: (g.count ?? 1) * 2 })),
    ...(details.tags || artist.tags || []),
  ]
  const tagProfile = profileFromTags(tags)

  const titles = await getWikiTitles(details)
  const [article, deSummary, enSummary] = await Promise.all([
    titles.en ? getEnglishArticle(titles.en).catch(() => "") : Promise.resolve(""),
    titles.de ? getSummary("de", titles.de) : Promise.resolve(null),
    titles.en ? getSummary("en", titles.en) : Promise.resolve(null),
  ])
  const textProfile = analyzeText(article)

  // Text-Themen heben Werte an (ein Thema, das Wikipedia erwähnt, ist eher stark vorhanden)
  const profile: Partial<UserProfile> = { ...tagProfile.values }
  for (const [k, v] of Object.entries(textProfile.values)) {
    const key = k as keyof UserProfile
    profile[key] = Math.max(profile[key] ?? 0, v as number)
  }
  // Christliche Bands nicht durch Wörter wie "devil" im Text als satanisch einstufen
  for (const rule of overrideRules) {
    if (tagProfile.matched.includes(rule.match)) Object.assign(profile, rule.values)
  }

  const topGenres = [...(details.genres?.length ? details.genres : tags)]
    .sort((a, b) => (b.count ?? 0) - (a.count ?? 0))
    .map((t) => t.name)
    .filter((n, i, arr) => arr.indexOf(n) === i)
    .slice(0, 5)

  const spotify =
    details.relations?.map((r) => r.url?.resource || "").find((u) => u.includes("open.spotify.com/artist")) ||
    `https://open.spotify.com/search/${encodeURIComponent(details.name)}`

  const summary = deSummary || enSummary
  const shortText = summary ? summary.text.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ") : ""
  const began = details["life-span"]?.begin?.slice(0, 4)

  const band: BandInfo = {
    name: details.name,
    genre: topGenres[0] || "unbekannt",
    subgenre: topGenres.slice(1).join(", ") || undefined,
    attitude: "",
    religion: "",
    themes: textProfile.found.length ? textProfile.found : tagProfile.matched,
    spotify,
    description: shortText || details.disambiguation || "Keine Beschreibung gefunden.",
    lyricStyle: [details.country, began ? `seit ${began}` : ""].filter(Boolean).join(", "),
    profile,
    source: {
      kind: "web",
      musicbrainz: `https://musicbrainz.org/artist/${details.id}`,
      wikipedia: summary?.url || undefined,
      tagCount: tags.length,
      lyricSentences: textProfile.sentenceCount,
    },
  }

  if (Object.keys(profile).length > 0) writeCache(normalize(query), band)
  return { status: "found", band }
}

// ---------- Bands nach Genre (für Empfehlungen / ähnliche Bands) ----------

export type GenreBand = { name: string; country?: string; tags: string[] }

/**
 * Sucht Bands mit einem bestimmten Genre-Tag auf MusicBrainz.
 * Sortiert nach der Anzahl Tag-Stimmen – bekanntere Bands haben mehr davon.
 */
export async function searchByGenre(genre: string, limit = 8, exclude: string[] = []): Promise<GenreBand[]> {
  const q = encodeURIComponent(`tag:"${genre.replace(/"/g, "")}" AND type:group`)
  const data = await getJson<{ artists: MbArtist[] }>(`${MB}/artist/?query=${q}&fmt=json&limit=100`)
  const skip = new Set(exclude.map(normalize))
  const seen = new Set<string>()
  return (data.artists || [])
    .filter((a) => {
      const key = normalize(a.name)
      if (!key || skip.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .map((a) => ({ a, votes: (a.tags || []).reduce((s, t) => s + (t.count ?? 0), 0) }))
    .sort((x, y) => y.votes - x.votes)
    .slice(0, limit)
    .map(({ a }) => ({
      name: a.name,
      country: a.country,
      tags: (a.tags || [])
        .sort((x, y) => (y.count ?? 0) - (x.count ?? 0))
        .map((t) => t.name)
        .slice(0, 3),
    }))
}

/** Kurze Pause, damit mehrere MusicBrainz-Anfragen hintereinander erlaubt sind */
export const mbPause = () => sleep(1100)

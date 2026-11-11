import type { BandInfo } from "./bands"
import type { UserProfile } from "./profile"
import { genreRules, overrideRules, themeKeywords } from "./genre-rules"

/*
 * Holt Band-Infos kostenlos aus dem Web – nur aus Quellen, die kommerziell genutzt werden dürfen:
 *   1. Wikipedia-Suche → findet die richtige Band (auch bei mehrdeutigen Namen wie "Ghost")
 *   2. Wikidata (CC0)  → Genres, Herkunftsland, Gründungsjahr, Spotify-Link
 *   3. Wikipedia-Text  → weitere Genre-Hinweise + Textthemen (wir zeigen nur kurze Auszüge mit Quellenlink)
 * Daraus wird mit den Regeln aus genre-rules.ts ein Profil geschätzt.
 */

const WIKIDATA_API = "https://www.wikidata.org/w/api.php"
const SPARQL = "https://query.wikidata.org/sparql"
const CACHE_KEY = "metal-detector-web-cache-v3"
const CACHE_DAYS = 30
// Wikimedia bittet Apps, sich zu erkennen zu geben (Browser dürfen den User-Agent nicht setzen)
const API_USER_AGENT = "MetalDetector/1.0 (https://at-metaldetector.de)"

type Tag = { name: string; count: number }
type Claims = Record<string, { mainsnak: { datavalue?: { value: unknown } } }[]>
type WdEntity = {
  id: string
  labels?: Record<string, { value: string }>
  descriptions?: Record<string, { value: string }>
  sitelinks?: Record<string, { title: string }>
  claims?: Claims
}

export type WebBandResult =
  | { status: "found"; band: BandInfo }
  | { status: "not-found" }
  | { status: "error"; message: string }

// ---------- kleine Helfer ----------

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms))

async function getJson<T>(url: string, retries = 3, delay = 1): Promise<T> {
  let res: Response
  try {
    res = await fetch(url, { headers: { Accept: "application/json", "Api-User-Agent": API_USER_AGENT } })
  } catch (e) {
    // Kurzer Verbindungsabbruch → einmal nachfassen
    if (retries <= 0) throw e
    await sleep(1000)
    return getJson<T>(url, 0, delay)
  }
  // Wikimedia bremst bei zu vielen Anfragen – kurz warten und nochmal
  if ((res.status === 429 || res.status === 503) && retries > 0) {
    const wait = Math.min(Number(res.headers.get("Retry-After")) || delay, 5)
    await sleep(wait * 1000)
    return getJson<T>(url, retries - 1, delay * 2)
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  return res.json() as Promise<T>
}

const qs = (params: Record<string, string | number>) =>
  new URLSearchParams(Object.entries(params).map(([k, v]) => [k, String(v)])).toString()

const normalize = (s: string) =>
  s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9]/g, "")

const clamp = (n: number) => Math.max(0, Math.min(10, Math.round(n)))

/** IDs aus einer Wikidata-Eigenschaft lesen (z. B. P136 = Genre) */
const claimIds = (claims: Claims | undefined, prop: string): string[] =>
  (claims?.[prop] ?? [])
    .map((c) => (c.mainsnak.datavalue?.value as { id?: string } | undefined)?.id)
    .filter((id): id is string => Boolean(id))

const claimString = (claims: Claims | undefined, prop: string): string | undefined => {
  const v = claims?.[prop]?.[0]?.mainsnak.datavalue?.value
  return typeof v === "string" ? v : undefined
}

const claimYear = (claims: Claims | undefined, prop: string): string | undefined => {
  const v = claims?.[prop]?.[0]?.mainsnak.datavalue?.value as { time?: string } | undefined
  return v?.time?.match(/^[+-](\d{4})/)?.[1]
}

// ---------- 1. Band finden (Wikipedia-Suche) ----------

type SearchPage = { title: string; index: number; description?: string; pageprops?: { wikibase_item?: string } }

const MUSIC_DESC = /\b(band|musician|singer|rapper|group|duo|trio|project|supergroup|artist|guitarist|vocalist|drummer|bassist|composer|orchestra)\b/i
const NOT_ARTIST_DESC = /\b(album|song|single|discography|list|tour|video|film|documentary|compilation|members|ep|concert|festival|disambiguation|topics)\b/i

async function findArtist(query: string): Promise<{ title: string; qid: string } | null> {
  const wanted = normalize(query)
  for (const term of [`${query} band`, query]) {
    const data = await getJson<{ query?: { pages: SearchPage[] } }>(
      `https://en.wikipedia.org/w/api.php?${qs({
        action: "query",
        generator: "search",
        gsrsearch: term,
        gsrlimit: 8,
        prop: "pageprops|description",
        ppprop: "wikibase_item",
        format: "json",
        formatversion: 2,
        origin: "*",
      })}`
    )
    const candidates = (data.query?.pages ?? [])
      .filter((p) => p.pageprops?.wikibase_item && !p.title.startsWith("List of"))
      .filter((p) => MUSIC_DESC.test(p.description ?? "") && !NOT_ARTIST_DESC.test(p.description ?? ""))
      .map((p) => {
        const base = normalize(p.title.replace(/\s*\(.*\)\s*$/, ""))
        // Exakter Name ("Ghost (Swedish band)" → "ghost") schlägt Namensähnlichkeit, dann die Suchreihenfolge
        const score = (base === wanted ? 1000 : base.startsWith(wanted) || wanted.startsWith(base) ? 300 : 0) - p.index * 10
        return { title: p.title, qid: p.pageprops!.wikibase_item!, score, base }
      })
      .filter((c) => c.score > 0 || normalize(c.title).includes(wanted))
      .sort((a, b) => b.score - a.score)
    if (candidates.length) return candidates[0]
  }
  return null
}

// ---------- 2. Wikidata ----------

async function getEntities(ids: string[], props: string, languages = "de|en"): Promise<Record<string, WdEntity>> {
  if (ids.length === 0) return {}
  const data = await getJson<{ entities: Record<string, WdEntity> }>(
    `${WIKIDATA_API}?${qs({
      action: "wbgetentities",
      ids: ids.slice(0, 50).join("|"),
      props,
      languages,
      sitefilter: "enwiki|dewiki",
      format: "json",
      origin: "*",
    })}`
  )
  return data.entities ?? {}
}

const label = (e: WdEntity | undefined, lang: "en" | "de") => e?.labels?.[lang]?.value ?? e?.labels?.[lang === "en" ? "de" : "en"]?.value

// ---------- 3. Wikipedia ----------

async function getEnglishArticle(title: string): Promise<string> {
  const data = await getJson<{ query: { pages: { extract?: string }[] } }>(
    `https://en.wikipedia.org/w/api.php?${qs({
      action: "query",
      prop: "extracts",
      explaintext: 1,
      redirects: 1,
      formatversion: 2,
      titles: title,
      format: "json",
      origin: "*",
    })}`
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

const escapeRe = (s: string) => s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")

const wordRegex = (w: string) => {
  const esc = escapeRe(w)
  // kurze Wörter nur als ganzes Wort (sonst trifft "war" auch "warm"), lange auch als Wortanfang
  return w.length < 5 ? new RegExp(`\\b${esc}s?\\b`, "g") : new RegExp(`\\b${esc}`, "g")
}

// Sätze, die etwas über Texte/Themen aussagen
const LYRIC_CONTEXT = /lyric|theme|thematic|concept|subject matter|inspired by|deals? with|dealing with|focus(es|ed)? on|topics?|imagery|message|songs? about|album about|sings? about|writes? about|ideolog|beliefs?/i

// Weltanschauungs-Themen: hier gelten strengere Regeln (Belege statt Vermutungen)
const IDEOLOGY_KEYS = new Set<keyof UserProfile>([
  "satanischeSymbolik",
  "gotteslaesterung",
  "antiReligion",
  "okkultismus",
  "heidentum",
  "christlicheThemen",
  "religioeseThemen",
  "nihilismus",
])

// Sätze wie "the band is not satanic" oder "they reject Satanism" sind kein Beleg
const NEGATION =
  /\b(not|never|no longer|nor|neither|deny|denies|denied|denying|reject|rejects|rejected|rejecting|distance[sd]?|refuse[sd]?|contrary|misconception|mistakenly|falsely|accus\w*|criticiz\w*|criticis\w*|opposed?|against)\b|n't\b/i

function analyzeText(article: string) {
  const sentences = article.split(/(?<=[.!?])\s+/).filter((s) => LYRIC_CONTEXT.test(s))
  const lower = sentences.map((s) => s.toLowerCase())
  const values: Partial<UserProfile> = {}
  const found: string[] = []

  /** Treffer zählen; bei Weltanschauungs-Themen Sätze mit Verneinung überspringen */
  const count = (words: string[], ideology: boolean) =>
    lower.reduce((n, sentence) => {
      if (ideology && NEGATION.test(sentence)) return n
      return n + words.reduce((m, w) => m + (sentence.match(wordRegex(w))?.length ?? 0), 0)
    }, 0)

  const satanicWords = themeKeywords.find((g) => g.keys.includes("satanischeSymbolik"))?.words ?? []
  const satanic = count(satanicWords, true)
  for (const group of themeKeywords) {
    const ideology = group.keys.some((k) => IDEOLOGY_KEYS.has(k))
    const hits = count(group.words, ideology)
    if (hits === 0) continue
    // Spielt eine Band mit satanischer Symbolik auf das Christentum an, ist das meist Parodie/Kritik,
    // keine christliche Botschaft → dann nur als "Religion" werten
    if (group.keys.includes("christlicheThemen") && satanic >= hits) {
      values.religioeseThemen = Math.max(values.religioeseThemen ?? 0, 6)
      continue
    }
    // Weltanschauung: eine einzelne Erwähnung ist nur ein Hinweis (4), erst mehrere Belege zählen stark
    const v = ideology
      ? hits >= 5 ? 9 : hits >= 3 ? 8 : hits === 2 ? 6 : 4
      : hits >= 5 ? 10 : hits >= 3 ? 9 : hits === 2 ? 8 : 7
    for (const k of group.keys) values[k] = Math.max(values[k] ?? 0, v)
    if (v >= 6 || !ideology) found.push(group.label)
  }
  return { values, found, sentenceCount: sentences.length }
}

// Zu allgemeine Begriffe, die im Artikeltext ständig vorkommen, zählen dort nicht als Genre
const NOT_FROM_ARTICLE = new Set(["rock", "epic", "space", "cyber", "occult", "satanic", "celtic", "hardcore", "industrial"])

/** Genres, die im Wikipedia-Artikel mehrfach erwähnt werden (mit Häufigkeit als Gewicht) */
function genresFromArticle(article: string): Tag[] {
  const text = article.toLowerCase()
  const tags: Tag[] = []
  for (const rule of genreRules) {
    if (NOT_FROM_ARTICLE.has(rule.match)) continue
    const re = new RegExp(`(^|[^a-z])${escapeRe(rule.match).replace(/-/g, "[- ]?")}(?=[^a-z]|$)`, "g")
    const hits = text.match(re)?.length ?? 0
    if (hits >= 2) tags.push({ name: rule.match, count: Math.min(hits, 4) })
  }
  // Christliche Bands erkennen (nur eindeutige Begriffe, nicht "anti-christian")
  const christian = (text.match(/(^|[^-a-z])(christian metal|christian rock|unblack metal|christian metalcore)/g) ?? []).length
  if (christian >= 1) tags.push({ name: "christian metal", count: 3 })
  return tags
}

function profileFromTags(tags: Tag[]) {
  const sums: Record<string, { total: number; weight: number }> = {}
  const matched = new Set<string>()

  for (const tag of tags) {
    const name = tag.name.toLowerCase()
    const weight = Math.max(tag.count, 1)
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

  let artist: { title: string; qid: string } | null
  try {
    artist = await findArtist(query)
  } catch (e) {
    return { status: "error", message: e instanceof Error ? e.message : "Netzwerkfehler" }
  }
  if (!artist) return { status: "not-found" }
  // Fällt Wikidata kurz aus, geht es mit den Genres aus dem Wikipedia-Artikel weiter
  const entity: WdEntity =
    (await getEntities([artist.qid], "claims|sitelinks|labels|descriptions").catch(() => ({}) as Record<string, WdEntity>))[artist.qid] ??
    { id: artist.qid }

  const claims = entity.claims
  const genreIds = claimIds(claims, "P136")
  // Bands: Herkunftsland (P495); Personen: Staatsangehörigkeit (P27)
  const countryId = claimIds(claims, "P495")[0] ?? claimIds(claims, "P27")[0]
  const deTitle = entity.sitelinks?.dewiki?.title
  const enTitle = entity.sitelinks?.enwiki?.title ?? artist.title

  // Genre-Namen, Artikeltext und deutsche Beschreibung gleichzeitig holen
  const [labels, article, deSummary, enSummary] = await Promise.all([
    getEntities([...genreIds, ...(countryId ? [countryId] : [])], "labels").catch(() => ({}) as Record<string, WdEntity>),
    getEnglishArticle(enTitle).catch(() => ""),
    deTitle ? getSummary("de", deTitle) : Promise.resolve(null),
    getSummary("en", enTitle),
  ])

  // Wikidata-Genres zählen dreifach, Erwähnungen im Artikel je nach Häufigkeit (1-4)
  const wikidataGenres = genreIds.map((id) => label(labels[id], "en")?.toLowerCase()).filter((g): g is string => Boolean(g))
  const tags: Tag[] = [...wikidataGenres.map((name) => ({ name, count: 3 })), ...genresFromArticle(article)]
  const tagProfile = profileFromTags(tags)
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

  // Anzeige: zuerst Genres, die wir kennen (Metal, Rock …), dann die übrigen
  const known = (g: string) => genreRules.some((r) => g.includes(r.match))
  const allGenres = [...wikidataGenres, ...genresFromArticle(article).sort((a, b) => b.count - a.count).map((t) => t.name)]
    .filter((n, i, arr) => arr.indexOf(n) === i)
  const topGenres = [...allGenres.filter(known), ...allGenres.filter((g) => !known(g))].slice(0, 5)

  const spotifyId = claimString(claims, "P1902")
  const name = label(entity, "en") || artist.title.replace(/\s*\(.*\)\s*$/, "")
  const spotify = spotifyId
    ? `https://open.spotify.com/artist/${spotifyId}`
    : `https://open.spotify.com/search/${encodeURIComponent(name)}`

  const summary = deSummary || enSummary
  const shortText = summary ? summary.text.split(/(?<=[.!?])\s+/).slice(0, 3).join(" ") : ""
  const country = countryId ? label(labels[countryId], "de") : undefined
  // Bands: Gründung (P571); Personen: Beginn der Schaffenszeit (P2031)
  const began = claimYear(claims, "P571") ?? claimYear(claims, "P2031")

  const band: BandInfo = {
    name,
    genre: topGenres[0] || "unbekannt",
    subgenre: topGenres.slice(1).join(", ") || undefined,
    attitude: "",
    religion: "",
    themes: textProfile.found.length ? textProfile.found : tagProfile.matched,
    spotify,
    description: shortText || entity.descriptions?.de?.value || entity.descriptions?.en?.value || "Keine Beschreibung gefunden.",
    lyricStyle: [country, began ? `seit ${began}` : ""].filter(Boolean).join(", "),
    profile,
    source: {
      kind: "web",
      wikidata: `https://www.wikidata.org/wiki/${entity.id}`,
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

// Wie unsere Genre-Namen bei Wikidata heißen (geprüft mit echten Wikidata-Daten)
const WIKIDATA_GENRE_LABELS: Record<string, string[]> = {
  "heavy metal": ["heavy metal music"],
  industrial: ["industrial metal"],
  gothic: ["gothic metal", "gothic rock"],
  pagan: ["pagan metal"],
  occult: ["occult rock"],
  sludge: ["sludge metal"],
  stoner: ["stoner rock", "stoner metal"],
  hardcore: ["hardcore punk"],
  crust: ["crust punk"],
  "funeral doom": ["funeral doom metal"],
  space: ["space rock"],
  cyber: ["cyber metal"],
  epic: ["epic metal"],
  rock: ["rock music"],
  nwobhm: ["new wave of British heavy metal"],
  "neue deutsche härte": ["Neue Deutsche Härte"],
  celtic: ["Celtic metal", "celtic metal"],
  depressive: ["depressive suicidal black metal"],
}

const capitalizeWords = (s: string) => s.split(" ").map((w) => (w ? w[0].toUpperCase() + w.slice(1) : w)).join(" ")

/**
 * Sucht bekannte Bands eines Genres auf Wikidata.
 * Sortiert nach der Zahl der Wikipedia-Sprachversionen – bekanntere Bands zuerst.
 */
export async function searchByGenre(genre: string, limit = 8, exclude: string[] = []): Promise<GenreBand[]> {
  const g = genre.trim().toLowerCase().replace(/["\\]/g, "")
  if (!g) return []
  const base = WIKIDATA_GENRE_LABELS[g] ?? [g]
  const variants = [...new Set(base.flatMap((v) => [v, v[0].toUpperCase() + v.slice(1), capitalizeWords(v)]))]
  const query = `SELECT DISTINCT ?band ?bandLabel ?desc ?links WHERE {
  VALUES ?lbl { ${variants.map((v) => `"${v}"@en`).join(" ")} }
  ?genre rdfs:label ?lbl .
  # Musikgruppe, Rockband, Heavy-Metal-Band, Musikensemble – Bands sind bei Wikidata unterschiedlich eingetragen
  VALUES ?bandType { wd:Q215380 wd:Q5741069 wd:Q56816954 wd:Q2088357 }
  ?band wdt:P136 ?genre ; wdt:P31 ?bandType ; wikibase:sitelinks ?links .
  OPTIONAL { ?band schema:description ?desc FILTER(LANG(?desc) = "de") }
  SERVICE wikibase:label { bd:serviceParam wikibase:language "en,de". }
} ORDER BY DESC(?links) LIMIT ${limit + exclude.length + 5}`
  const data = await getJson<{ results: { bindings: Record<string, { value: string }>[] } }>(
    `${SPARQL}?${qs({ query, format: "json" })}`
  )
  const skip = new Set(exclude.map(normalize))
  const seen = new Set<string>()
  return data.results.bindings
    .map((b) => ({ name: b.bandLabel?.value ?? "", desc: b.desc?.value }))
    .filter((b) => {
      const key = normalize(b.name)
      // Ohne Namen liefert Wikidata nur die ID (z. B. "Q123") – solche Treffer überspringen
      if (!key || /^q\d+$/.test(key) || skip.has(key) || seen.has(key)) return false
      seen.add(key)
      return true
    })
    .slice(0, limit)
    .map((b) => ({ name: b.name, tags: b.desc ? [b.desc] : [] }))
}

/** Kurze Pause zwischen mehreren Abfragen, damit Wikidata uns nicht bremst */
export const apiPause = () => sleep(300)

// ---------- Für die KI-Bandsuche ----------

/** Profil aus einer Genre-Liste schätzen (gleiche Regeln wie bei Wikidata-Genres) */
export function profileFromGenres(genres: string[]): Partial<UserProfile> {
  return profileFromTags(genres.map((name) => ({ name, count: 3 }))).values
}

/** Ein Ergebnis (z. B. von der KI-Bandsuche) auf dem Gerät zwischenspeichern */
export function cacheBand(query: string, band: BandInfo) {
  if (Object.keys(band.profile).length > 0) writeCache(normalize(query), band)
}

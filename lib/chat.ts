import type { BandInfo } from "./bands"
import { findBand } from "./band-source"
import { genreRules } from "./genre-rules"
import { calculateMatch } from "./match"
import { getPropertyLabel, type ProfileKey, type UserProfile } from "./profile"
import { mbPause, searchByGenre, type GenreBand } from "./web-lookup"

/*
 * Chat-Engine ohne KI: erkennt typische deutsche Sätze ("Wie passt X zu mir?",
 * "Bands wie X", "Ich hasse Growls" …) und beantwortet sie mit Web-Daten
 * und dem Nutzerprofil.
 */

export type ChatAction = { label: string; type: "band" | "say" | "undo" | "link"; value: string }
export type BotReply = { text: string; actions?: ChatAction[] }
export type LastBand = { name: string; info: BandInfo } | null

export type ChatOutcome = {
  replies: BotReply[]
  /** Neues Profil, falls der Nutzer per Chat etwas geändert hat */
  profile?: UserProfile
  /** Band, die als Hauptanalyse angezeigt werden soll (inkl. Ampel) */
  analyze?: { name: string; info: BandInfo; note?: string }
  /** Band, auf die sich Folgefragen beziehen sollen */
  lastBand?: LastBand
}

type Ctx = { profile: UserProfile; lastBand: LastBand }

// ---------- Text-Helfer ----------

/** Kleinschreibung + Umlaute ersetzen, damit "Härte", "haerte" und "HÄRTE" gleich sind */
export const norm = (s: string) =>
  s
    .toLowerCase()
    .replace(/ä/g, "ae")
    .replace(/ö/g, "oe")
    .replace(/ü/g, "ue")
    .replace(/ß/g, "ss")
    .replace(/\s+/g, " ")
    .trim()

const words = (s: string) => s.split(/\s+/).filter(Boolean)

const PRONOUNS = /^(die|sie|der|das|den|denen|ihr|ihnen|diese|dieser|die band|denn|es)$/i

/** Bandnamen aus einem Satzteil säubern ("Sabaton denn so?" → "Sabaton") */
function cleanBand(raw: string | undefined): string {
  if (!raw) return ""
  let s = raw.trim()
  s = s.replace(/[?!.,;:]+$/g, "").trim()
  s = s.replace(/\s+(zu mir|fuer mich|für mich|so|denn|eigentlich|ueberhaupt|überhaupt|mal|bitte|aus|an)$/i, "").trim()
  s = s.replace(/\s+(zu mir|fuer mich|für mich|so|denn|eigentlich)$/i, "").trim()
  s = s.replace(/^(die band|der band|band|die gruppe|von|über|ueber|zu)\s+/i, "").trim()
  s = s.replace(/^["'„“]|["'„“]$/g, "").trim()
  return s
}

const bandAction = (name: string): ChatAction => ({ label: `🎸 ${name}`, type: "band", value: name })
const sayAction = (label: string, value = label): ChatAction => ({ label, type: "say", value })

// ---------- Profil-Eigenschaften per Chat erkennen ----------

const synonyms: Record<ProfileKey, string[]> = {
  haerte: ["haerte", "hart", "aggressiv", "brutal", "heftig"],
  melodie: ["melodie", "melodien", "melodisch", "eingaengig"],
  atmosphaere: ["atmosphaere", "atmosphaerisch", "stimmung", "klanglandschaft"],
  melancholie: ["melancholie", "melancholisch", "traurig"],
  technik: ["technik", "technisch", "soli", "solo", "gitarrensoli", "frickel"],
  progressive: ["progressiv", "progressive", "prog", "experimentell", "komplex"],
  groove: ["groove", "groovig", "rhythmus", "kopfnick"],
  cleanVocals: ["clean vocals", "klarer gesang", "klaren gesang", "cleaner gesang", "cleanen gesang", "clean gesang", "cleangesang", "clean"],
  growls: ["growls", "growl", "growling", "growlen", "grunzen", "gegrunze"],
  screams: ["screams", "scream", "screamen", "schreien", "geschrei", "kreischen", "gekreische", "shouts"],
  symphonisch: ["symphonisch", "sinfonisch", "orchester", "orchestral", "choere", "chor"],
  liveEnergie: ["live-energie", "live energie", "liveenergie"],
  natur: ["natur", "umwelt", "wald", "waelder"],
  mythologie: ["mythologie", "mythen", "wikinger", "goetter", "sagen"],
  philosophie: ["philosophie", "philosophisch", "sinnfragen"],
  persoenlicheEntwicklung: ["persoenliche entwicklung", "selbstueberwindung", "wachstum"],
  innereKaempfe: ["innere kaempfe", "selbstzweifel", "psyche", "mentale gesundheit"],
  verlustTrauer: ["verlust", "trauer"],
  hoffnung: ["hoffnung", "hoffnungsvoll", "positive texte", "positiv"],
  gesellschaftskritik: ["gesellschaftskritik", "sozialkritik", "politik", "politisch", "kritische texte"],
  geschichte: ["geschichte", "historisch", "historie"],
  scienceFiction: ["science fiction", "science-fiction", "sci-fi", "scifi"],
  fantasy: ["fantasy", "drachen", "fantasie"],
  krieg: ["krieg", "schlachten", "schlacht"],
  horror: ["horror", "gore", "splatter"],
  kosmos: ["kosmos", "weltall", "universum", "weltraum"],
  abenteuer: ["abenteuer", "piraten", "reisen"],
  christlicheThemen: ["christlich", "christen", "christentum", "jesus", "gott", "glaube", "glauben"],
  spirituelleNeutralitaet: ["neutrale texte", "religionsfrei", "spirituell neutral"],
  religioeseThemen: ["religioes", "religion"],
  hoffnungErloesung: ["erloesung"],
  moralischeWerte: ["moral", "moralisch", "werte"],
  innereKaempfeTexte: [],
  existenzialismus: ["existenzialismus", "existenziell"],
  nihilismus: ["nihilismus", "nihilistisch", "sinnlos"],
  antiReligion: ["anti-religion", "anti religion", "antireligioes", "religionskritik"],
  gotteslaesterung: ["gotteslaesterung", "blasphemie", "blasphemisch"],
  satanischeSymbolik: ["satanisch", "satanismus", "satan", "teufel"],
  okkultismus: ["okkultismus", "okkult", "hexen", "rituale"],
  heidentum: ["heidentum", "heidnisch", "paganismus", "pagan"],
  mystik: ["mystik", "mystisch", "esoterik"],
  dunkelheitAesthetik: ["dunkelheit", "dunkel", "duester"],
  moshpitFaktor: ["moshpit", "moshen", "circle pit", "wall of death", "pit"],
  publikumsenergie: ["publikumsenergie"],
  buehnenpraesenz: ["buehnenpraesenz", "buehnenshow", "pyro", "show"],
  publikumsinteraktion: ["publikumsinteraktion", "mitsingen", "mitmachen"],
  festivalTauglichkeit: ["festivals", "festival"],
}

// Längste Synonyme zuerst, damit "anti-religion" nicht als "religion" erkannt wird
const synonymList = Object.entries(synonyms)
  .flatMap(([key, list]) => list.map((w) => ({ key: key as ProfileKey, w })))
  .sort((a, b) => b.w.length - a.w.length)

function findProperties(clause: string): ProfileKey[] {
  let text = ` ${clause} `
  const found: ProfileKey[] = []
  for (const { key, w } of synonymList) {
    const re = new RegExp(`(^|[^a-z])${w.replace(/[-]/g, "[- ]?")}[a-z]{0,3}(?=[^a-z]|$)`)
    const m = text.match(re)
    if (!m) continue
    if (!found.includes(key)) found.push(key)
    // Fundstelle "ausradieren", damit sie nicht nochmal trifft
    text = text.replace(m[0], m[0].replace(/[a-z]/g, "#"))
  }
  return found
}

type Sentiment = { set: number } | { delta: number }

function findSentiment(clause: string): Sentiment | null {
  const c = ` ${clause} `
  if (/egal|neutral|wurscht|wurst|mittelmaessig/.test(c)) return { set: 5 }
  if (/hasse|verabscheue|ueberhaupt nicht|gar nicht|gar kein|auf keinen fall|niemals|bloss nicht|geht gar nicht|kotz|ekel|bitte kein/.test(c)) return { set: 0 }
  if (/weniger/.test(c)) return { delta: -2 }
  if (/(^|[^a-z])(kein|keine|keinen|keiner|nicht|ohne|nervt|nerven|stoert|stoeren|doof|schlecht|bloed|nervig|abturn)([^a-z]|$)/.test(c)) return { set: 2 }
  if (/(^|[^a-z])mehr([^a-z]|$)/.test(c)) return { delta: +2 }
  if (/liebe|unbedingt|sehr gern|richtig gut|abfeier|feiere|geil|mega|am liebsten|ganz wichtig|sehr wichtig|(^|[^a-z])viel(e|en)?([^a-z]|$)|vergoetter/.test(c)) return { set: 10 }
  if (/(^|[^a-z])(mag|moechte|gern|gerne|gut|stehe? auf|wichtig|interessier|cool|will|super|toll|klasse)([^a-z]|$)/.test(c)) return { set: 8 }
  return null
}

function parseProfileChanges(text: string, profile: UserProfile): { key: ProfileKey; from: number; to: number }[] {
  const clauses = norm(text).split(/,|;|\baber\b|\bjedoch\b|\bdafuer\b|\bsondern\b|\.|!/)
  const changes: { key: ProfileKey; from: number; to: number }[] = []
  let lastSentiment: Sentiment | null = null

  for (const clause of clauses) {
    const keys = findProperties(clause)
    const sentiment = findSentiment(clause) ?? lastSentiment
    if (keys.length === 0 || !sentiment) {
      if (findSentiment(clause)) lastSentiment = findSentiment(clause)
      continue
    }
    lastSentiment = sentiment
    for (const key of keys) {
      const from = profile[key]
      const to = "set" in sentiment ? sentiment.set : Math.max(0, Math.min(10, from + sentiment.delta))
      changes.push({ key, from, to })
      // Innere Kämpfe gibt es zweimal (Themen + Texte) – beide mitziehen
      if (key === "innereKaempfe") changes.push({ key: "innereKaempfeTexte", from: profile.innereKaempfeTexte, to })
    }
  }
  return changes
}

// ---------- Genres, die zum Profil passen ----------

function rankGenres(profile: UserProfile) {
  // Eigenschaften, zu denen du eine klare Meinung hast, zählen stärker.
  // Fehlt einem Genre so eine Eigenschaft, gilt sie dort als neutral (5).
  const strong = (Object.keys(profile) as ProfileKey[]).filter((k) => Math.abs(profile[k] - 5) >= 2)
  return genreRules
    .filter((r) => Object.keys(r.values).length >= 5 && r.match !== "rock")
    .map((r) => {
      const keys = [...new Set([...(Object.keys(r.values) as ProfileKey[]), ...strong])]
      let score = 0
      let max = 0
      for (const k of keys) {
        const v = r.values[k] ?? 5
        const w = 0.3 + Math.abs(profile[k] - 5)
        score += w * (10 - Math.abs(v - profile[k]))
        max += w * 10
      }
      return { genre: r.match, percent: Math.round((score / max) * 100) }
    })
    .sort((a, b) => b.percent - a.percent)
}

const isNeutralProfile = (p: UserProfile) => Object.values(p).every((v) => v === 5)

// ---------- Antworten ----------

const HELP: BotReply = {
  text:
    "Das kann ich für dich tun 🤘\n\n" +
    "🎸 **Band bewerten** – „Wie passt Sabaton zu mir?“ oder einfach „Powerwolf“\n" +
    "⚖️ **Vergleichen** – „Gojira oder Mastodon?“\n" +
    "🔎 **Ähnliche Bands** – „Bands wie Amon Amarth“\n" +
    "💡 **Empfehlungen** – „Empfiehl mir was“\n" +
    "⚙️ **Profil per Chat ändern** – „Ich hasse Growls“, „Mehr Melodie bitte“\n" +
    "🎤 **Folgefragen** – „Wie sind die live?“, „Warum?“\n" +
    "👤 **Über dich** – „Was mag ich?“, „Welche Genres passen zu mir?“",
  actions: [sayAction("Empfiehl mir was"), sayAction("Was mag ich?"), sayAction("Bands wie Metallica")],
}

async function analyzeBand(query: string): Promise<ChatOutcome> {
  const found = await findBand(query)
  if (!found.ok) {
    return {
      replies: [
        found.reason === "offline"
          ? { text: `📡 Ich komme gerade nicht ins Web (${found.message}). Prüf deine Verbindung und versuch es nochmal.` }
          : {
              text: `Zu **${query}** habe ich im Web nichts gefunden. Prüf mal die Schreibweise 🤔`,
              actions: [{ label: "🎧 Auf Spotify suchen", type: "link", value: `https://open.spotify.com/search/${encodeURIComponent(query)}` }],
            },
      ],
    }
  }
  return {
    replies: [],
    analyze: { name: found.name, info: found.info, note: found.note },
    lastBand: { name: found.name, info: found.info },
  }
}

async function resolveBand(query: string, ctx: Ctx): Promise<{ name: string; info: BandInfo } | string> {
  if (!query || PRONOUNS.test(query)) {
    if (ctx.lastBand) return ctx.lastBand
    return "Welche Band meinst du? Such erst eine Band, dann kann ich Folgefragen beantworten 🎸"
  }
  if (ctx.lastBand && norm(ctx.lastBand.name) === norm(query)) return ctx.lastBand
  const found = await findBand(query)
  if (!found.ok) {
    return found.reason === "offline"
      ? `📡 Ich komme gerade nicht ins Web (${found.message}).`
      : `Zu **${query}** habe ich nichts gefunden 🤔`
  }
  return { name: found.name, info: found.info }
}

function bandGenres(info: BandInfo): string[] {
  return [info.genre, ...(info.subgenre ? info.subgenre.split(/,\s*/) : [])]
    .map((g) => g.toLowerCase().trim())
    .filter((g) => g && g !== "unbekannt")
}

function formatBandList(bands: GenreBand[]) {
  return bands.map((b) => `• **${b.name}**${b.country ? ` (${b.country})` : ""}${b.tags.length ? ` – ${b.tags.join(", ")}` : ""}`).join("\n")
}

async function similarBands(query: string, ctx: Ctx): Promise<ChatOutcome> {
  const band = await resolveBand(query, ctx)
  if (typeof band === "string") return { replies: [{ text: band }] }

  const genres = bandGenres(band.info).slice(0, 2)
  if (genres.length === 0) return { replies: [{ text: `Zu **${band.name}** kenne ich leider keine Genres, daher finde ich keine ähnlichen Bands.` }] }

  const results: GenreBand[] = []
  try {
    for (const [i, g] of genres.entries()) {
      if (i > 0) await mbPause()
      const list = await searchByGenre(g, 5, [band.name, ...results.map((r) => r.name)])
      results.push(...list)
    }
  } catch {
    return { replies: [{ text: "📡 Ich komme gerade nicht ins Web. Versuch es gleich nochmal." }] }
  }
  const picks = results.slice(0, 8)
  if (picks.length === 0) return { replies: [{ text: `Ich habe leider keine ähnlichen Bands zu **${band.name}** gefunden.` }], lastBand: band }

  return {
    replies: [
      {
        text: `Wenn dir **${band.name}** gefällt (${genres.join(", ")}), schau dir diese Bands an:\n\n${formatBandList(picks)}\n\nTipp eine an, dann prüfe ich, wie gut sie zu deinem Profil passt 👇`,
        actions: picks.map((b) => bandAction(b.name)),
      },
    ],
    lastBand: band,
  }
}

async function recommend(ctx: Ctx): Promise<ChatOutcome> {
  const top = rankGenres(ctx.profile).slice(0, 3)
  const results: { genre: string; bands: GenreBand[] }[] = []
  const taken: string[] = []
  try {
    for (const [i, g] of top.entries()) {
      if (i > 0) await mbPause()
      const bands = await searchByGenre(g.genre, 3, taken)
      taken.push(...bands.map((b) => b.name))
      results.push({ genre: g.genre, bands })
    }
  } catch {
    return { replies: [{ text: "📡 Ich komme gerade nicht ins Web. Versuch es gleich nochmal." }] }
  }

  let text = isNeutralProfile(ctx.profile)
    ? "Dein Profil steht noch überall auf 5 (neutral) – erzähl mir, was du magst („Ich liebe Melodie“, „Keine Growls“), dann werden die Tipps genauer!\n\nHier ein paar Vorschläge zum Start:\n\n"
    : "Basierend auf deinem Profil passen diese Richtungen am besten zu dir:\n\n"
  for (const r of results) {
    const percent = top.find((t) => t.genre === r.genre)?.percent
    text += `**${r.genre}** (${percent}%)\n${r.bands.length ? formatBandList(r.bands) : "• (nichts gefunden)"}\n\n`
  }
  text += "Tipp eine Band an, dann prüfe ich sie genau 👇"
  return { replies: [{ text, actions: results.flatMap((r) => r.bands).map((b) => bandAction(b.name)) }] }
}

async function compare(a: string, b: string, ctx: Ctx): Promise<ChatOutcome> {
  const first = await resolveBand(a, ctx)
  if (typeof first === "string") return { replies: [{ text: first }] }
  const second = await resolveBand(b, ctx)
  if (typeof second === "string") return { replies: [{ text: second }] }

  const m1 = calculateMatch(first.name, first.info, ctx.profile)
  const m2 = calculateMatch(second.name, second.info, ctx.profile)
  const icon = (r: typeof m1.rating) => (r === "green" ? "🟢" : r === "yellow" ? "🟡" : r === "red" ? "🔴" : "⚪")

  // Wo unterscheiden sich die beiden Bands am meisten?
  const keys = (Object.keys(first.info.profile) as ProfileKey[]).filter((k) => second.info.profile[k] !== undefined)
  const diffs = keys
    .map((k) => ({ k, a: first.info.profile[k]!, b: second.info.profile[k]! }))
    .filter((d) => Math.abs(d.a - d.b) >= 3)
    .sort((x, y) => Math.abs(y.a - y.b) - Math.abs(x.a - x.b))
    .slice(0, 5)

  let text = `⚖️ **${first.name}** vs. **${second.name}**\n\n`
  text += `${icon(m1.rating)} ${first.name}: **${m1.matchPercentage}%**\n${icon(m2.rating)} ${second.name}: **${m2.matchPercentage}%**\n\n`
  const diff = m1.matchPercentage - m2.matchPercentage
  if (Math.abs(diff) < 3) text += "Beide passen etwa gleich gut zu dir – Geschmackssache! 🤘"
  else text += `👉 **${diff > 0 ? first.name : second.name}** passt besser zu dir.`
  if (diffs.length) {
    text += `\n\n**Größte Unterschiede:**\n`
    text += diffs
      .map((d) => `• ${getPropertyLabel(d.k)}: ${first.name} ${d.a} · ${second.name} ${d.b} · Du ${ctx.profile[d.k]}`)
      .join("\n")
  }
  const winner = diff >= 0 ? first : second
  return { replies: [{ text, actions: [bandAction(first.name), bandAction(second.name)] }], lastBand: winner }
}

async function liveInfo(query: string, ctx: Ctx): Promise<ChatOutcome> {
  const band = await resolveBand(query, ctx)
  if (typeof band === "string") return { replies: [{ text: band }] }
  const liveKeys: ProfileKey[] = ["liveEnergie", "moshpitFaktor", "publikumsenergie", "buehnenpraesenz", "publikumsinteraktion", "festivalTauglichkeit"]
  const known = liveKeys.filter((k) => band.info.profile[k] !== undefined)
  if (known.length === 0) return { replies: [{ text: `Zur Live-Show von **${band.name}** habe ich leider keine Daten.` }], lastBand: band }

  const avg = known.reduce((s, k) => s + band.info.profile[k]!, 0) / known.length
  let text = `🎤 **${band.name} live:**\n\n`
  text += known.map((k) => `• ${getPropertyLabel(k)}: ${band.info.profile[k]}/10 (Du: ${ctx.profile[k]})`).join("\n")
  text += avg >= 8.5 ? "\n\n🔥 Live ein echtes Brett!" : avg >= 6.5 ? "\n\n🤘 Live solide unterwegs." : "\n\n🎧 Eher was zum Zuhören als zum Abgehen."
  return { replies: [{ text }], lastBand: band }
}

function explainLast(ctx: Ctx): ChatOutcome {
  if (!ctx.lastBand) return { replies: [{ text: "Worauf beziehst du dich? Such zuerst eine Band 🎸" }] }
  const { name, info } = ctx.lastBand
  const keys = (Object.keys(info.profile) as ProfileKey[]).filter((k) => info.profile[k] !== undefined)
  const rows = keys.map((k) => ({ k, band: info.profile[k]!, you: ctx.profile[k], diff: Math.abs(info.profile[k]! - ctx.profile[k]) }))
  const good = rows.filter((r) => r.diff <= 2).sort((a, b) => Math.max(b.band, b.you) - Math.max(a.band, a.you)).slice(0, 4)
  const bad = rows.sort((a, b) => b.diff - a.diff).filter((r) => r.diff >= 4).slice(0, 4)
  const m = calculateMatch(name, info, ctx.profile)

  let text = `So komme ich bei **${name}** auf **${m.matchPercentage}%**:\n\n`
  text += `Ich vergleiche ${keys.length} Eigenschaften. Pro Eigenschaft gibt es 10 Punkte minus den Abstand zwischen Band und dir.\n\n`
  if (good.length) text += `👍 **Passt:**\n${good.map((r) => `• ${getPropertyLabel(r.k)} (Band ${r.band}, Du ${r.you})`).join("\n")}\n\n`
  if (bad.length) text += `👎 **Passt nicht:**\n${bad.map((r) => `• ${getPropertyLabel(r.k)} (Band ${r.band}, Du ${r.you})`).join("\n")}\n\n`
  if (info.source) text += "ℹ️ Die Band-Werte sind aus Genres und Wikipedia geschätzt."
  return { replies: [{ text: text.trim() }] }
}

function profileSummary(profile: UserProfile): ChatOutcome {
  if (isNeutralProfile(profile)) {
    return {
      replies: [
        {
          text: "Ich weiß noch nichts über dich – alles steht auf 5 (neutral) 🤷\n\nErzähl mir einfach, was du magst, z. B. „Ich liebe Melodie und Orchester, aber keine Growls“. Oder stell es in den Profil-Einstellungen ein.",
          actions: [sayAction("Ich liebe Melodie"), sayAction("Keine Growls")],
        },
      ],
    }
  }
  const entries = Object.entries(profile) as [ProfileKey, number][]
  const likes = entries.filter(([, v]) => v >= 7).sort((a, b) => b[1] - a[1])
  const dislikes = entries.filter(([, v]) => v <= 3).sort((a, b) => a[1] - b[1])
  let text = "👤 **Dein Profil:**\n\n"
  if (likes.length) text += `❤️ **Magst du:**\n${likes.slice(0, 8).map(([k, v]) => `• ${getPropertyLabel(k)} (${v})`).join("\n")}\n\n`
  if (dislikes.length) text += `🚫 **Magst du nicht:**\n${dislikes.slice(0, 8).map(([k, v]) => `• ${getPropertyLabel(k)} (${v})`).join("\n")}\n\n`
  const genres = rankGenres(profile).slice(0, 3)
  text += `🎯 **Deine Richtung:** ${genres.map((g) => `${g.genre} (${g.percent}%)`).join(", ")}`
  return { replies: [{ text, actions: [sayAction("Empfiehl mir was")] }] }
}

function genresForMe(profile: UserProfile): ChatOutcome {
  const ranked = rankGenres(profile)
  const top = ranked.slice(0, 5)
  const bottom = ranked.slice(-3).reverse()
  let text = "🎯 **Diese Genres passen am besten zu dir:**\n\n"
  text += top.map((g, i) => `${i + 1}. ${g.genre} – ${g.percent}%`).join("\n")
  text += `\n\n🚫 **Eher nicht:** ${bottom.map((g) => `${g.genre} (${g.percent}%)`).join(", ")}`
  if (isNeutralProfile(profile)) text += "\n\n(Dein Profil ist noch neutral – erzähl mir mehr über deinen Geschmack!)"
  return { replies: [{ text, actions: top.slice(0, 3).map((g) => sayAction(`Bands: ${g.genre}`, `Zeig mir ${g.genre} Bands`)) }] }
}

async function genreBands(genre: string): Promise<ChatOutcome> {
  try {
    const bands = await searchByGenre(genre, 8)
    if (bands.length === 0) return { replies: [{ text: `Zu **${genre}** habe ich keine Bands gefunden.` }] }
    return {
      replies: [{ text: `🎸 **${genre}** – bekannte Bands:\n\n${formatBandList(bands)}`, actions: bands.map((b) => bandAction(b.name)) }],
    }
  } catch {
    return { replies: [{ text: "📡 Ich komme gerade nicht ins Web. Versuch es gleich nochmal." }] }
  }
}

// ---------- Hauptfunktion ----------

export async function respond(input: string, ctx: Ctx): Promise<ChatOutcome> {
  const text = input.trim()
  const n = norm(text)
  const wordCount = words(n).length
  let m: RegExpMatchArray | null

  if (!n) return { replies: [] }

  // Begrüßung / Dank
  if (wordCount <= 4 && /^(hi|hallo|hey|moin|servus|na|yo|huhu|guten (morgen|tag|abend)|gruess)/.test(n)) {
    return { replies: [{ text: "Hey Kumpel! 🤘 Worauf hast du Bock? Ich kann Bands bewerten, vergleichen, ähnliche finden oder dir was empfehlen.", actions: HELP.actions }] }
  }
  if (wordCount <= 5 && /^(danke|dankeschoen|thx|thanks|merci|super|cool|nice|geil|top|perfekt|ok|okay|alles klar)/.test(n)) {
    return { replies: [{ text: "Immer gern! 🤘 Sag Bescheid, wenn du die nächste Band checken willst." }] }
  }

  // Hilfe
  if (/hilfe|was kannst du|wie funktioniert|was geht hier|befehle|^help|was kann ich (dich )?fragen/.test(n)) return { replies: [HELP] }

  // Genre-Bands ("Zeig mir viking metal Bands")
  if ((m = n.match(/zeig (mir )?(ein paar |paar |einige )?(.+?) bands?$/)) && genreRules.some((r) => r.match === m![3].trim())) {
    return genreBands(m[3].trim())
  }

  // Vergleich
  if ((m = text.match(/vergleich\w*\s+(.+?)\s+(?:mit|und|vs\.?|gegen|oder)\s+(.+)/i))) {
    return compare(cleanBand(m[1]), cleanBand(m[2]), ctx)
  }
  if ((m = text.match(/^(?:wer ist besser[,:]?\s*|was ist besser[,:]?\s*|lieber\s+)?(.+?)\s+(?:oder|vs\.?|gegen)\s+(.+?)\??$/i))) {
    const [a, b] = [cleanBand(m[1]), cleanBand(m[2])]
    if (a && b && words(a).length <= 4 && words(b).length <= 4 && findProperties(norm(text)).length === 0) return compare(a, b, ctx)
  }

  // Ähnliche Bands
  if ((m = text.match(/(?:bands?|musik|sowas|so was|etwas|was|kuenstler|künstler)\s+(?:wie|(?:ä|ae|a)hnlich(?:\s+(?:wie|zu))?)\s+(.+)/i)) ||
      (m = text.match(/(?:ä|ae|a)hnlich(?:e|es)?\s+(?:wie|zu)\s+(.+)/i))) {
    return similarBands(cleanBand(m[1]), ctx)
  }
  if (/aehnlich|vergleichbar|mehr davon|mehr in der art|mehr in die richtung/.test(n) && wordCount <= 6) {
    return similarBands("", ctx)
  }

  // Empfehlungen
  if (/empfehl|empfiehl|vorschlag|vorschlaege|tipps?\b|was soll ich (hoeren|hören)|neue bands|entdecken|was koennte mir gefallen|was gefaellt mir/.test(n)) {
    return recommend(ctx)
  }

  // Über den Nutzer
  if (/welche (genres?|richtung|stil|musikrichtung)|genres? (passt|passen)|was fuer (ein )?genre/.test(n)) return genresForMe(ctx.profile)
  if (/mein profil|was mag ich|meine vorlieben|mein geschmack|was weisst du (ueber|von) mir|wie ticke ich|kennst du mich/.test(n)) return profileSummary(ctx.profile)

  // Live
  if (/(^|[^a-z])live([^a-z]|$)|konzert|auf der buehne/.test(n) && wordCount <= 8 && findSentiment(n) === null) {
    const rest = text
      .replace(/\b(und|wie|sind|ist|klingen|wirken|waren|die|sie|denn|so|eigentlich|live|konzert(e)?|auf|der|bühne|buehne|im|was|mit|von)\b/gi, " ")
      .replace(/[?!.]/g, " ")
      .trim()
    return liveInfo(cleanBand(rest), ctx)
  }

  // Warum?
  if (/^(und )?(warum|wieso|weshalb|begruend|erklaer|wie kommst du)/.test(n)) return explainLast(ctx)

  // Band-Fragen
  const bandPatterns = [
    /wie\s+(?:passt|passen|gef(?:ä|ae|a)llt|findest du|ist|sind|w(?:ä|ae|a)re?n?)\s+(?:mir\s+)?(.+?)(?:\s+(?:zu mir|f(?:ü|ue|u)r mich))?\s*\??$/i,
    /(?:kennst du|magst du|was h(?:ä|ae|a)ltst du von|was sagst du zu|was ist mit|taugt|taugen|lohnt sich|lohnen sich|passt|passen)\s+(.+?)(?:\s+(?:zu mir|f(?:ü|ue|u)r mich|was))?\s*\??$/i,
    /(?:analysier\w*|check\w*|bewert\w*|pr(?:ü|ue|u)f\w*|such\w*|infos?\s+(?:zu|(?:ü|ue|u)ber)|erz(?:ä|ae|a)hl\w*(?:\s+mir)?(?:\s+(?:mehr|was|etwas))?\s+(?:(?:ü|ue|u)ber|von))\s+(.+)/i,
    /^(?:und\s+)?(?:was ist mit|wie w(?:ä|ae|a)re es mit|und)\s+(.+?)\s*\??$/i,
  ]
  for (const re of bandPatterns) {
    if ((m = text.match(re))) {
      const name = cleanBand(m[1])
      if (name && !PRONOUNS.test(name) && findProperties(norm(name)).length === 0) return analyzeBand(name)
      if (name && PRONOUNS.test(name) && ctx.lastBand) return explainLast(ctx)
    }
  }

  // Profil per Chat ändern
  const changes = parseProfileChanges(text, ctx.profile)
  if (changes.length > 0) {
    const profile = { ...ctx.profile }
    for (const c of changes) profile[c.key] = c.to
    const shown = changes.filter((c) => c.key !== "innereKaempfeTexte" || !changes.some((x) => x.key === "innereKaempfe"))
    const lines = shown.map((c) => `• ${getPropertyLabel(c.key)}: ${c.from} → **${c.to}**`).join("\n")
    return {
      replies: [{ text: `Alles klar, ich habe dein Profil angepasst ✍️\n\n${lines}`, actions: [{ label: "↩️ Rückgängig", type: "undo", value: "" }, sayAction("Empfiehl mir was")] }],
      profile,
    }
  }

  // "Ich mag Metallica" → ähnliche Bands vorschlagen
  if ((m = text.match(/^ich\s+(?:mag|liebe|h(?:ö|oe|o)re(?:\s+gerne?)?|feiere)\s+(.+?)[.!]?$/i))) {
    return similarBands(cleanBand(m[1]), ctx)
  }

  // Kurze Eingabe ohne erkennbare Frage → wahrscheinlich ein Bandname
  if (wordCount <= 5 && !/^(was|wie|wer|wo|warum|wann|ich|du|kannst|hast|bist|gibt)\b/.test(n)) {
    return analyzeBand(cleanBand(text))
  }

  return {
    replies: [
      {
        text: "Hmm, das habe ich nicht ganz verstanden 🤔\n\nFrag mich zum Beispiel „Wie passt Ghost zu mir?“, „Bands wie Nightwish“ oder sag mir, was du magst („Ich liebe Orchester“).",
        actions: [sayAction("Hilfe"), sayAction("Empfiehl mir was")],
      },
    ],
  }
}

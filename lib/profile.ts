export type UserProfile = {
  // BEREICH 1 - MUSIK / SOUND
  haerte: number
  melodie: number
  atmosphaere: number
  melancholie: number
  technik: number
  progressive: number
  groove: number
  cleanVocals: number
  growls: number
  screams: number
  symphonisch: number
  liveEnergie: number

  // BEREICH 2 - THEMEN DER BAND
  natur: number
  mythologie: number
  philosophie: number
  persoenlicheEntwicklung: number
  innereKaempfe: number
  verlustTrauer: number
  hoffnung: number
  gesellschaftskritik: number
  geschichte: number
  scienceFiction: number
  fantasy: number
  krieg: number
  horror: number
  kosmos: number
  abenteuer: number

  // BEREICH 3 - TEXTE & IDEOLOGIE
  spirituelleNeutralitaet: number
  christlicheThemen: number
  religioeseThemen: number
  hoffnungErloesung: number
  moralischeWerte: number
  innereKaempfeTexte: number
  existenzialismus: number
  nihilismus: number
  antiReligion: number
  gotteslaesterung: number
  satanischeSymbolik: number
  okkultismus: number
  heidentum: number
  mystik: number
  dunkelheitAesthetik: number

  // BEREICH 4 - LIVE EXPERIENCE
  moshpitFaktor: number
  publikumsenergie: number
  buehnenpraesenz: number
  publikumsinteraktion: number
  festivalTauglichkeit: number
}

export type ProfileKey = keyof UserProfile

type SliderDef = { key: ProfileKey; label: string; question?: string }

// Reihenfolge, Kurz-Label (für die Analyse) und Frage (für die Einstellungen)
export const profileSections: { id: string; tab: string; title: string; sliders: SliderDef[] }[] = [
  {
    id: "musik",
    tab: "Musik/Sound",
    title: "Musik & Sound",
    sliders: [
      { key: "haerte", label: "Härte", question: "Wie aggressiv darf die Musik sein?" },
      { key: "melodie", label: "Melodie", question: "Wie wichtig sind eingängige Melodien?" },
      { key: "atmosphaere", label: "Atmosphäre", question: "Wie wichtig sind Klanglandschaften und Stimmung?" },
      { key: "melancholie", label: "Melancholie", question: "Wie sehr magst du melancholische Musik?" },
      { key: "technik", label: "Technik", question: "Wie wichtig sind Soli, komplexe Arrangements?" },
      { key: "progressive", label: "Progressive Elemente", question: "Wie experimentell darf die Musik sein?" },
      { key: "groove", label: "Groove", question: "Wie wichtig sind Rhythmus und Kopfnick-Faktor?" },
      { key: "cleanVocals", label: "Clean Vocals", question: "Wie wichtig ist klarer Gesang?" },
      { key: "growls", label: "Growls", question: "Wie gerne hörst du Growls?" },
      { key: "screams", label: "Screams", question: "Wie gerne hörst du Screams?" },
      { key: "symphonisch", label: "Symphonische Elemente", question: "Orchester, Chöre, epische Klangflächen" },
      { key: "liveEnergie", label: "Live-Energie", question: "Wie wichtig ist eine mitreißende Live-Performance?" },
    ],
  },
  {
    id: "themen",
    tab: "Themen",
    title: "Themen der Band",
    sliders: [
      { key: "natur", label: "Natur", question: "Wälder, Berge, Jahreszeiten, Landschaften" },
      { key: "mythologie", label: "Mythologie", question: "Nordisch, griechisch, keltisch usw." },
      { key: "philosophie", label: "Philosophie", question: "Sinnfragen, Existenz, Erkenntnis" },
      { key: "persoenlicheEntwicklung", label: "Persönliche Entwicklung", question: "Wachstum, Selbstüberwindung, Reife" },
      { key: "innereKaempfe", label: "Innere Kämpfe", question: "Selbstzweifel, Krisen, mentale Stärke" },
      { key: "verlustTrauer", label: "Verlust und Trauer" },
      { key: "hoffnung", label: "Hoffnung" },
      { key: "gesellschaftskritik", label: "Gesellschaftskritik" },
      { key: "geschichte", label: "Geschichte", question: "Historische Ereignisse und Persönlichkeiten" },
      { key: "scienceFiction", label: "Science Fiction" },
      { key: "fantasy", label: "Fantasy" },
      { key: "krieg", label: "Krieg" },
      { key: "horror", label: "Horror" },
      { key: "kosmos", label: "Kosmos und Universum" },
      { key: "abenteuer", label: "Abenteuer und Reisen" },
    ],
  },
  {
    id: "texte",
    tab: "Texte/Ideologie",
    title: "Texte & Ideologie",
    sliders: [
      { key: "spirituelleNeutralitaet", label: "Spirituelle Neutralität", question: "Texte ohne religiöse Agenda" },
      { key: "christlicheThemen", label: "Christliche Themen" },
      { key: "religioeseThemen", label: "Religiöse Themen allgemein" },
      { key: "hoffnungErloesung", label: "Hoffnung und Erlösung" },
      { key: "moralischeWerte", label: "Moralische Werte" },
      { key: "innereKaempfeTexte", label: "Innere Kämpfe (in Texten)" },
      { key: "existenzialismus", label: "Existenzialismus" },
      { key: "nihilismus", label: "Nihilismus", question: "'Alles ist sinnlos'" },
      { key: "antiReligion", label: "Anti-Religion" },
      { key: "gotteslaesterung", label: "Gotteslästerung" },
      { key: "satanischeSymbolik", label: "Satanische Symbolik" },
      { key: "okkultismus", label: "Okkultismus" },
      { key: "heidentum", label: "Heidentum / Paganismus" },
      { key: "mystik", label: "Mystik" },
      { key: "dunkelheitAesthetik", label: "Dunkelheit als Ästhetik" },
    ],
  },
  {
    id: "live",
    tab: "Live",
    title: "Live Experience",
    sliders: [
      { key: "moshpitFaktor", label: "Moshpit-Faktor" },
      { key: "publikumsenergie", label: "Publikumsenergie" },
      { key: "buehnenpraesenz", label: "Bühnenpräsenz" },
      { key: "publikumsinteraktion", label: "Publikumsinteraktion" },
      { key: "festivalTauglichkeit", label: "Festival-Tauglichkeit" },
    ],
  },
]

const allSliders = profileSections.flatMap((s) => s.sliders)

export const defaultProfile = Object.fromEntries(allSliders.map((s) => [s.key, 5])) as UserProfile

export const getPropertyLabel = (key: string): string =>
  allSliders.find((s) => s.key === key)?.label ?? key

const STORAGE_KEY = "metal-detector-profile"

export function loadProfile(): UserProfile {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    if (!raw) return defaultProfile
    return { ...defaultProfile, ...JSON.parse(raw) }
  } catch {
    return defaultProfile
  }
}

export function saveProfile(profile: UserProfile) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(profile))
  } catch {
    // Speicher nicht verfügbar (z. B. privater Modus) – App funktioniert trotzdem
  }
}

// ---------- Ausgeschaltete Themen ("ist mir egal") ----------
// Ein ausgeschaltetes Thema zählt nirgends mit: nicht in der Ampel, nicht bei Ausschlusskriterien,
// nicht in Empfehlungen. Der eingestellte Wert bleibt erhalten, falls es wieder eingeschaltet wird.

const DISABLED_KEY = "metal-detector-disabled"
const allKeys = new Set<string>(allSliders.map((s) => s.key))

export function loadDisabled(): ProfileKey[] {
  try {
    const raw = JSON.parse(localStorage.getItem(DISABLED_KEY) || "[]")
    return Array.isArray(raw) ? raw.filter((k): k is ProfileKey => allKeys.has(k)) : []
  } catch {
    return []
  }
}

export function saveDisabled(keys: ProfileKey[]) {
  try {
    localStorage.setItem(DISABLED_KEY, JSON.stringify(keys))
  } catch {
    /* egal */
  }
}

/** Aktueller Stand für Berechnung, Chat und KI (die Seite hält ihn aktuell) */
let disabledNow = new Set<ProfileKey>()
let onDisabledChange: ((keys: ProfileKey[]) => void) | null = null

export const disabledBridge = {
  get: (): ProfileKey[] => [...disabledNow],
  has: (key: ProfileKey) => disabledNow.has(key),
  set: (keys: ProfileKey[]) => {
    disabledNow = new Set(keys)
    onDisabledChange?.([...disabledNow])
  },
  connect: (keys: ProfileKey[], listener: (keys: ProfileKey[]) => void) => {
    disabledNow = new Set(keys)
    onDisabledChange = listener
  },
}

/** Nur die Themen, die mitzählen */
export const isActive = (key: ProfileKey) => !disabledNow.has(key)

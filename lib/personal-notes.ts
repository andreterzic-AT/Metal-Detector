/*
 * Persönliche Wertungen: Was der Nutzer selbst über eine Band sagt
 * ("bei Metallica meide ich die Songs, die sich über Jesus lustig machen").
 * Wird auf dem Gerät gespeichert, wie Profil und Merkliste.
 * Die berechnete Ampel bleibt unverändert – die persönliche Wertung steht daneben.
 */

export type NoteVerdict = "green" | "yellow" | "red"

export type PersonalNote = {
  /** Anzeigename der Band */
  band: string
  /** Eigene Ampel: grün = höre ich, gelb = teilweise, rot = meide ich */
  verdict: NoteVerdict
  /** Was gemieden wird (Songs, Alben, Phasen) */
  avoid: string
  /** Was okay ist */
  ok: string
  /** Freie Notiz */
  note: string
  updatedAt: number
}

export const VERDICT_LABELS: Record<NoteVerdict, string> = {
  green: "Höre ich",
  yellow: "Teilweise",
  red: "Meide ich",
}

export const VERDICT_COLORS: Record<NoteVerdict, string> = {
  green: "#22c55e",
  yellow: "#eab308",
  red: "#ef4444",
}

const STORAGE_KEY = "metal-detector-notes"

/** Gleiche Band trotz unterschiedlicher Schreibweise finden ("AC/DC" = "acdc") */
export const noteKey = (name: string) =>
  name
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[^a-z0-9]/g, "")

export type NoteBook = Record<string, PersonalNote>

export function loadNotes(): NoteBook {
  try {
    const raw = JSON.parse(localStorage.getItem(STORAGE_KEY) || "{}")
    return raw && typeof raw === "object" ? raw : {}
  } catch {
    return {}
  }
}

export function saveNotes(notes: NoteBook) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(notes))
  } catch {
    /* Speicher nicht verfügbar – gilt dann nur bis zum Schließen der App */
  }
}

export const getNote = (notes: NoteBook, band: string): PersonalNote | undefined => notes[noteKey(band)]

export function setNote(notes: NoteBook, note: Omit<PersonalNote, "updatedAt">): NoteBook {
  const clean: PersonalNote = {
    band: note.band.trim().slice(0, 80),
    verdict: note.verdict,
    avoid: note.avoid.trim().slice(0, 400),
    ok: note.ok.trim().slice(0, 400),
    note: note.note.trim().slice(0, 600),
    updatedAt: Date.now(),
  }
  return { ...notes, [noteKey(clean.band)]: clean }
}

export function removeNote(notes: NoteBook, band: string): NoteBook {
  const next = { ...notes }
  delete next[noteKey(band)]
  return next
}

/** Bands, die der Nutzer persönlich meidet – tauchen in Empfehlungen nicht mehr auf */
export const redNoteBands = (notes: NoteBook) => Object.values(notes).filter((n) => n.verdict === "red").map((n) => n.band)

/** Kurze Zusammenfassung für Chat und KI */
export function noteSummary(n: PersonalNote): string {
  const parts = [`${VERDICT_LABELS[n.verdict]}`]
  if (n.avoid) parts.push(`meide: ${n.avoid}`)
  if (n.ok) parts.push(`okay: ${n.ok}`)
  if (n.note) parts.push(n.note)
  return parts.join(" · ")
}

/**
 * Eine Notiz gilt global für die App. Die Chat-Engine und die KI-Werkzeuge greifen über
 * diese kleine Brücke darauf zu, ohne dass sie den React-State kennen müssen.
 */
let current: NoteBook = {}
let onChange: ((notes: NoteBook) => void) | null = null

export const notesBridge = {
  get: () => current,
  set: (notes: NoteBook) => {
    current = notes
    onChange?.(notes)
  },
  /** Von der Seite aufgerufen: aktuellen Stand setzen und auf Änderungen hören */
  connect: (notes: NoteBook, listener: (notes: NoteBook) => void) => {
    current = notes
    onChange = listener
  },
}

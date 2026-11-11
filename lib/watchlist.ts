import type { BandInfo } from "./bands"

/** Ein Eintrag auf der Merkliste */
export type WatchItem = {
  name: string
  /** Band-Daten, damit die Übereinstimmung später mit dem aktuellen Profil neu berechnet werden kann */
  info: BandInfo
  addedAt: number
  /** Schon angehört? */
  listened: boolean
  /** Datenstand: ab 2 ohne pauschale Weltanschauungs-Werte aus dem Genre */
  v?: number
}

const STORAGE_KEY = "metal-detector-watchlist"

const key = (name: string) => name.trim().toLowerCase()

// Weltanschauungs-Werte, die frühere Versionen pauschal aus dem Genre geschätzt haben
const IDEOLOGY_KEYS = ["satanischeSymbolik", "gotteslaesterung", "antiReligion", "okkultismus", "heidentum", "spirituelleNeutralitaet"] as const

/** Alte Einträge (vor Version 2) aus der Web-Suche: pauschale Genre-Werte entfernen, Rest bleibt */
function migrate(item: WatchItem): WatchItem {
  if ((item.v ?? 1) >= 2 || item.info.source?.kind !== "web") return { ...item, v: 2 }
  const profile = { ...item.info.profile }
  for (const k of IDEOLOGY_KEYS) delete profile[k]
  return { ...item, v: 2, info: { ...item.info, profile } }
}

export function loadWatchlist(): WatchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? (JSON.parse(raw) as WatchItem[]) : []
    return Array.isArray(list) ? list.filter((i) => i && i.name && i.info).map(migrate) : []
  } catch {
    return []
  }
}

export function saveWatchlist(list: WatchItem[]) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(list))
  } catch {
    // Speicher nicht verfügbar – Liste gilt dann nur bis zum Schließen der App
  }
}

export const isOnWatchlist = (list: WatchItem[], name: string) => list.some((i) => key(i.name) === key(name))

export function findOnWatchlist(list: WatchItem[], name: string): WatchItem | undefined {
  return list.find((i) => key(i.name) === key(name))
}

export function addToWatchlist(list: WatchItem[], name: string, info: BandInfo): WatchItem[] {
  if (isOnWatchlist(list, name)) return list
  return [{ name, info, addedAt: Date.now(), listened: false, v: 2 }, ...list]
}

export const removeFromWatchlist = (list: WatchItem[], name: string) => list.filter((i) => key(i.name) !== key(name))

export const toggleListened = (list: WatchItem[], name: string) =>
  list.map((i) => (key(i.name) === key(name) ? { ...i, listened: !i.listened } : i))

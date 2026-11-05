import type { BandInfo } from "./bands"

/** Ein Eintrag auf der Merkliste */
export type WatchItem = {
  name: string
  /** Band-Daten, damit die Übereinstimmung später mit dem aktuellen Profil neu berechnet werden kann */
  info: BandInfo
  addedAt: number
  /** Schon angehört? */
  listened: boolean
}

const STORAGE_KEY = "metal-detector-watchlist"

const key = (name: string) => name.trim().toLowerCase()

export function loadWatchlist(): WatchItem[] {
  try {
    const raw = localStorage.getItem(STORAGE_KEY)
    const list = raw ? (JSON.parse(raw) as WatchItem[]) : []
    return Array.isArray(list) ? list.filter((i) => i && i.name && i.info) : []
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
  return [{ name, info, addedAt: Date.now(), listened: false }, ...list]
}

export const removeFromWatchlist = (list: WatchItem[], name: string) => list.filter((i) => key(i.name) !== key(name))

export const toggleListened = (list: WatchItem[], name: string) =>
  list.map((i) => (key(i.name) === key(name) ? { ...i, listened: !i.listened } : i))

import { bandDatabase, type BandInfo } from "./bands"
import { lookupBand } from "./web-lookup"

export type FoundBand =
  | { ok: true; name: string; info: BandInfo; note?: string }
  | { ok: false; reason: "not-found" | "offline"; message?: string }

/** Band suchen: zuerst im Web, sonst in der eingebauten Liste */
export async function findBand(query: string): Promise<FoundBand> {
  const name = query.trim()
  const result = await lookupBand(name)
  const local = bandDatabase[name.toLowerCase()]

  if (result.status === "found") return { ok: true, name: result.band.name || name, info: result.band }
  if (local) {
    return {
      ok: true,
      name,
      info: local,
      note:
        result.status === "error"
          ? "📡 Keine Verbindung zum Web – ich nutze meine eingebaute Liste."
          : "Im Web nichts gefunden – ich nutze meine eingebaute Liste.",
    }
  }
  if (result.status === "error") return { ok: false, reason: "offline", message: result.message }
  return { ok: false, reason: "not-found" }
}

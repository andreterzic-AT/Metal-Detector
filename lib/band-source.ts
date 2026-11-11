import { bandDatabase, type BandInfo } from "./bands"
import { lookupBand } from "./web-lookup"
import { aiBandLookup } from "./ai-band"

export type FoundBand =
  | { ok: true; name: string; info: BandInfo; note?: string }
  | { ok: false; reason: "not-found" | "offline"; message?: string }

/** Band suchen: zuerst im Web, sonst in der eingebauten Liste */
export async function findBand(query: string): Promise<FoundBand> {
  const name = query.trim()
  const result = await lookupBand(name)
  const local = bandDatabase[name.toLowerCase()]

  if (result.status === "found") {
    // Wikipedia-Eintrag ohne verwertbare Genres? Dann lieber die KI recherchieren lassen
    if (Object.keys(result.band.profile).length < 3) {
      const ai = await aiBandLookup(name)
      if (ai.status === "found") {
        return { ok: true, name: ai.band.name || name, info: ai.band, note: "🔎 Wikipedia hatte kaum Infos – ich habe per KI-Websuche nachrecherchiert. Die Werte sind geschätzt." }
      }
    }
    return { ok: true, name: result.band.name || name, info: result.band }
  }
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
  // Wikipedia/Wikidata kennen die Band nicht (oder sind gerade nicht erreichbar) → KI recherchiert im Web
  const ai = await aiBandLookup(name)
  if (ai.status === "found") {
    return {
      ok: true,
      name: ai.band.name || name,
      info: ai.band,
      note: "🔎 Die Band stand nicht bei Wikipedia – ich habe sie per KI-Websuche recherchiert. Die Werte sind geschätzt.",
    }
  }
  if (ai.status === "not-found") return { ok: false, reason: "not-found" }
  if (result.status === "error") return { ok: false, reason: "offline", message: result.message }
  return { ok: false, reason: "not-found" }
}

import Perplexity from "@perplexity-ai/perplexity_ai"
import { BAND_SCHEMA, clean, researchInstructions, type BandResearch } from "./band-research"

/*
 * KI-Bandsuche über die Perplexity Agent API (POST /v1/responses, Alias von /v1/agent).
 * Eine einzige Anfrage: Perplexity sucht selbst im Web (Werkzeug web_search) und gibt das
 * Ergebnis als JSON nach BAND_SCHEMA zurück (response_format). Die gefundenen Quellen
 * kommen aus den search_results bzw. aus den Zitaten (annotations) der Antwort.
 */

/** Voreinstellung (Modell, Werkzeuge, Grenzen) der Agent API; "low" = schnell und günstig */
export const PERPLEXITY_EFFORT = "low"

const INSTRUCTIONS = researchInstructions("return the result as a single JSON object matching the given schema, without any other text")

export async function researchBandPerplexity(client: Perplexity, name: string): Promise<BandResearch> {
  const response = await client.responses.create({
    input: `Band/Künstler: "${name}"`,
    instructions: INSTRUCTIONS,
    effort: PERPLEXITY_EFFORT,
    tools: [{ type: "web_search" }],
    response_format: {
      type: "json_schema",
      json_schema: { name: "band_profile", schema: BAND_SCHEMA, strict: true },
    },
    max_output_tokens: 4096,
    stream: false,
  })
  if (response.status === "failed" || response.error) throw new Error("no-result")

  let data: Record<string, unknown>
  try {
    data = JSON.parse(stripCodeFence(response.output_text)) as Record<string, unknown>
  } catch {
    throw new Error("no-result")
  }
  return clean(data, collectSources(response.output))
}

/** Quellen: zuerst die Zitate im Antworttext, danach die übrigen Suchergebnisse */
function collectSources(output: Perplexity.OutputItem[]): Map<string, string> {
  const sources = new Map<string, string>()
  for (const item of output) {
    if (item.type !== "message") continue
    for (const part of item.content) {
      for (const a of part.annotations ?? []) {
        if (a.url && !sources.has(a.url)) sources.set(a.url, a.title || a.url)
      }
    }
  }
  for (const item of output) {
    if (item.type !== "search_results") continue
    for (const r of item.results) {
      if (r.url && !sources.has(r.url)) sources.set(r.url, r.title || r.url)
    }
  }
  return sources
}

const stripCodeFence = (text: string) => text.trim().replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/, "")

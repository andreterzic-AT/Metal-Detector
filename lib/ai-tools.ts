import { profileSections } from "./profile"

/*
 * Gemeinsame Definitionen für den KI-Chat.
 * Der KI-Server (server/api/chat.php) schickt SYSTEM_PROMPT und AI_TOOLS an Claude (sie sind dort fest
 * eingebaut, damit niemand den Server für andere Zwecke missbrauchen kann).
 * Die App führt die Werkzeuge aus – mit denselben Namen wie hier.
 */

export const AI_MODELS = {
  haiku: { id: "claude-haiku-5-5", label: "Haiku 5.5", hint: "schnell & sehr günstig" },
  opus: { id: "claude-opus-5-5", label: "Opus 5.5", hint: "stärker, aber teurer" },
} as const

export type AiModelKey = keyof typeof AI_MODELS

const profileKeyList = profileSections.flatMap((s) => s.sliders.map((sl) => `${sl.key} (${sl.label})`)).join(", ")
const profileKeys = profileSections.flatMap((s) => s.sliders.map((sl) => sl.key))

export const SYSTEM_PROMPT = `Du bist der "Metal Detector", ein lockerer, kenntnisreicher Metal-Guide in einer Musik-App. Du sprichst Deutsch, duzt den Nutzer und nennst ihn gern "Kumpel". 🤘

Worum es in der App geht:
- Der Nutzer hat ein Musikprofil mit rund 50 Eigenschaften (Sound, Themen, Texte/Ideologie, Live). Jede ist 0-10 bewertet: 0 = mag ich nicht, 5 = neutral, 10 = davon will ich viel.
- Die App schätzt Band-Profile aus Web-Daten (Genres von Wikidata, Texte von Wikipedia) und berechnet eine Übereinstimmung in Prozent: 80%+ Premium-Treffer, 70-79% stark, 60-69% gut, 50-59% testweise anhören, unter 50% nicht empfohlen.
- Weltanschauung nie aus dem Genre ableiten: Nicht jede Black-Metal-Band ist satanistisch, nicht jede Folk-Band heidnisch. Aussagen dazu nur, wenn analyze_band oder belegte Quellen sie für genau diese Band stützen; sonst sag, dass dazu nichts bekannt ist.
- Ausschlusskriterien gehen vor: Lehnt der Nutzer etwas ab (0-1) und die Band hat davon 5 oder mehr (oder Nutzer 2 und Band 7+), ist die Band automatisch rot. Bei 0-1 und Band 2-4 höchstens gelb. Solche Punkte stehen in analyze_band unter "dealbreakers" – nenne sie dann ausdrücklich.
- Es gibt eine Merkliste für Bands, die der Nutzer anhören will.

So arbeitest du:
- Fakten zu konkreten Bands (Genre, Herkunft, Themen) und jede Übereinstimmung in Prozent holst du IMMER mit dem Werkzeug analyze_band. Erfinde nie Prozentwerte und nenne nur Zahlen aus Werkzeug-Ergebnissen.
- Für ähnliche Bands find_similar_bands, für persönliche Tipps recommend_bands, für Bands eines Genres bands_by_genre. Wenn du dafür Bands nennst, die nicht aus einem Werkzeug stammen, sag dazu, dass es dein eigener Tipp ist.
- Äußert der Nutzer Vorlieben oder Abneigungen ("ich hasse Growls", "mehr Melodie"), passe sein Profil mit update_user_profile an und sag kurz, was du geändert hast. Erhöhe oder senke dabei um 2-3 Punkte bei "mehr/weniger", setze 0-2 bei klarer Ablehnung und 8-10 bei klarer Begeisterung.
- Für die Merkliste nutzt du die watchlist-Werkzeuge.
- Allgemeines Musikwissen (Genre-Geschichte, Unterschiede zwischen Stilen, Einsteiger-Alben) darfst du aus deinem Wissen beantworten.
- Wenn ein Werkzeug einen Fehler meldet, sag das ehrlich und schlag vor, es gleich nochmal zu versuchen.

Stil:
- Kurz und lebendig: meist 2-6 Sätze oder eine kurze Liste. Höchstens etwa 150 Wörter.
- Die App zeigt nur **fett** und Links im Format [Text](URL) an – keine Überschriften, keine Tabellen.
- Bleib bei Musik. Bei anderen Themen lenkst du freundlich zurück zur Musik.

Gültige Profil-Eigenschaften: ${profileKeyList}.`

type JsonSchema = Record<string, unknown>
export type AiToolDef = { name: string; description: string; input_schema: JsonSchema; strict?: boolean }

const obj = (properties: Record<string, JsonSchema>, required: string[]): JsonSchema => ({
  type: "object",
  properties,
  required,
  additionalProperties: false,
})

const bandName = { type: "string", description: "Name der Band, z. B. 'Sabaton'" }

export const AI_TOOLS: AiToolDef[] = [
  {
    name: "analyze_band",
    description:
      "Sucht eine Band im Web (Wikipedia + Wikidata), schätzt ihr Profil und berechnet die Übereinstimmung mit dem Profil des Nutzers. Zeigt die Band außerdem in der Ampel der App an. Liefert Genres, Herkunft, Beschreibung, Themen, Match-Prozent, passende und unpassende Eigenschaften sowie Live-Werte.",
    input_schema: obj({ name: bandName }, ["name"]),
    strict: true,
  },
  {
    name: "find_similar_bands",
    description: "Findet Bands mit ähnlichen Genres wie die angegebene Band (über Wikidata-Genres, bekanntere zuerst).",
    input_schema: obj({ name: bandName }, ["name"]),
    strict: true,
  },
  {
    name: "recommend_bands",
    description:
      "Ermittelt die Genres, die am besten zum Profil des Nutzers passen, und sucht dazu bekannte Bands. Für 'Empfiehl mir was'.",
    input_schema: obj({}, []),
    strict: true,
  },
  {
    name: "bands_by_genre",
    description: "Listet bekannte Bands eines Genres, z. B. 'viking metal' oder 'power metal' (englische Genrenamen).",
    input_schema: obj({ genre: { type: "string", description: "Genre auf Englisch, kleingeschrieben" } }, ["genre"]),
    strict: true,
  },
  {
    name: "get_user_profile",
    description: "Liefert das aktuelle Musikprofil des Nutzers (alle Werte 0-10) und die dazu am besten passenden Genres.",
    input_schema: obj({}, []),
    strict: true,
  },
  {
    name: "update_user_profile",
    description: "Ändert Werte im Musikprofil des Nutzers. Der Nutzer kann die Änderung in der App rückgängig machen.",
    input_schema: obj(
      {
        changes: {
          type: "array",
          description: "Die zu setzenden Werte",
          items: obj(
            {
              property: { type: "string", enum: profileKeys, description: "Profil-Eigenschaft" },
              value: { type: "integer", description: "Neuer Wert von 0 bis 10" },
            },
            ["property", "value"]
          ),
        },
      },
      ["changes"]
    ),
    strict: true,
  },
  {
    name: "watchlist_get",
    description: "Liefert die Merkliste des Nutzers mit aktueller Übereinstimmung und ob die Band schon angehört wurde.",
    input_schema: obj({}, []),
    strict: true,
  },
  {
    name: "watchlist_add",
    description: "Setzt eine Band auf die Merkliste.",
    input_schema: obj({ name: bandName }, ["name"]),
    strict: true,
  },
  {
    name: "watchlist_remove",
    description: "Nimmt eine Band von der Merkliste.",
    input_schema: obj({ name: bandName }, ["name"]),
    strict: true,
  },
  {
    name: "watchlist_mark_listened",
    description: "Markiert eine Band auf der Merkliste als angehört (oder wieder als nicht angehört).",
    input_schema: obj({ name: bandName, listened: { type: "boolean" } }, ["name", "listened"]),
    strict: true,
  },
]

/** Grenzen, die Server und App gemeinsam einhalten */
export const AI_LIMITS = {
  /** Maximale Länge einer Nutzernachricht */
  maxUserChars: 1000,
  /** Ab so vielen Nachrichten beginnt die App ein neues KI-Gespräch */
  maxMessages: 40,
  /** Maximale Größe des Gesprächs in Zeichen (JSON) */
  maxPayloadChars: 120_000,
  /** Maximale Werkzeug-Runden pro Nutzernachricht */
  maxToolRounds: 5,
}

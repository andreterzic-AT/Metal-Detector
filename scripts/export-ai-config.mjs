// Exportiert Auftrag (System-Prompt), Werkzeuge, Modelle und Grenzen des KI-Chats
// aus lib/ai-tools.ts nach server/api/ai-config.json – für den PHP-Server.
import { build } from "esbuild"
import { writeFileSync, mkdtempSync, rmSync } from "node:fs"
import { join } from "node:path"
import { tmpdir } from "node:os"
import { createRequire } from "node:module"

const dir = mkdtempSync(join(tmpdir(), "ai-config-"))
const outfile = join(dir, "ai-tools.cjs")
await build({ entryPoints: ["lib/ai-tools.ts"], bundle: true, platform: "node", format: "cjs", outfile, logLevel: "error" })
const { SYSTEM_PROMPT, AI_TOOLS, AI_MODELS, AI_LIMITS } = createRequire(import.meta.url)(outfile)
rmSync(dir, { recursive: true, force: true })

const config = { system: SYSTEM_PROMPT, tools: AI_TOOLS, models: AI_MODELS, limits: AI_LIMITS }
writeFileSync("server/api/ai-config.json", JSON.stringify(config, null, 1) + "\n")
console.log(`server/api/ai-config.json: ${AI_TOOLS.length} Werkzeuge, Modelle: ${Object.keys(AI_MODELS).join(", ")}`)

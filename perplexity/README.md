# Perplexity Agent API (web-grounded answers)

Standalone module using the official SDK `@perplexity-ai/perplexity_ai`
(`client.responses.create`, alias of `POST /v1/agent`) with the `web_search` tool.

```bash
cd perplexity
npm install
export PERPLEXITY_API_KEY=...   # create at https://console.perplexity.ai (needs paid credits)
npm run smoke                    # minimal request, prints HTTP status + response shape
npm run ask -- "Welche Alben hat Ghost veröffentlicht?"
npm run typecheck && npm test
```

`src/agent.ts` exports `ask(input, opts)` with `effort`/`model`, `previousResponseId`
(multi-turn), `jsonSchema` (structured output via `response_format`) and returns
`text`, `citations`, `sources`.

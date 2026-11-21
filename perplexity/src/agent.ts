import Perplexity from '@perplexity-ai/perplexity_ai';

type CreateParams = Perplexity.ResponseCreateParams;
type CreateResponse = Perplexity.ResponseCreateResponse;
type OutputItem = Perplexity.OutputItem;

export type Citation = { url: string; title?: string };
export type Source = { title: string; url: string; snippet: string; date?: string };

export interface AskOptions {
  /** Explicit model, e.g. "openai/gpt-5.6-sol". Ignored by the API if `effort` selects a preset bundle. */
  model?: string;
  /** Preset/effort level (replaces the deprecated `preset` field in SDK >= 0.43). */
  effort?: string;
  instructions?: string;
  /** Continue a prior conversation turn. */
  previousResponseId?: string;
  /** Tools to enable. Defaults to web_search. Pass [] to disable tools. */
  tools?: CreateParams['tools'];
  /** JSON schema for structured output; the parsed result is returned in `json`. */
  jsonSchema?: { name: string; schema: Record<string, unknown>; strict?: boolean };
  maxOutputTokens?: number;
  signal?: AbortSignal;
}

export interface AskResult<T = unknown> {
  id: string;
  model: string;
  text: string;
  json?: T;
  citations: Citation[];
  sources: Source[];
  usage?: CreateResponse['usage'];
}

export class MissingApiKeyError extends Error {
  constructor() {
    super(
      'PERPLEXITY_API_KEY is not set. Create a key at https://console.perplexity.ai and export it in your shell.',
    );
    this.name = 'MissingApiKeyError';
  }
}

let cached: Perplexity | undefined;

/** Lazily constructs a client from PERPLEXITY_API_KEY. The SDK retries 429/5xx (honoring Retry-After) by default. */
export function getClient(): Perplexity {
  if (cached) return cached;
  if (!process.env['PERPLEXITY_API_KEY']) throw new MissingApiKeyError();
  cached = new Perplexity({ maxRetries: 3 });
  return cached;
}

export function buildRequest(input: CreateParams['input'], opts: AskOptions = {}): CreateParams {
  const req: CreateParams = {
    input,
    tools: opts.tools ?? [{ type: 'web_search' }],
  };
  if (opts.model) req.model = opts.model;
  if (opts.effort) req.effort = opts.effort;
  if (!opts.model && !opts.effort) req.effort = 'low';
  if (opts.instructions) req.instructions = opts.instructions;
  if (opts.previousResponseId) req.previous_response_id = opts.previousResponseId;
  if (opts.maxOutputTokens) req.max_output_tokens = opts.maxOutputTokens;
  if (opts.jsonSchema) {
    req.response_format = { type: 'json_schema', json_schema: opts.jsonSchema };
  }
  return req;
}

export function extractCitations(output: OutputItem[]): Citation[] {
  const seen = new Map<string, Citation>();
  for (const item of output) {
    if (item.type !== 'message') continue;
    for (const part of item.content) {
      for (const a of part.annotations ?? []) {
        if (a.url && !seen.has(a.url)) seen.set(a.url, { url: a.url, title: a.title });
      }
    }
  }
  return [...seen.values()];
}

export function extractSources(output: OutputItem[]): Source[] {
  const sources: Source[] = [];
  for (const item of output) {
    if (item.type !== 'search_results') continue;
    for (const r of item.results) {
      sources.push({ title: r.title, url: r.url, snippet: r.snippet, date: r.date });
    }
  }
  return sources;
}

/** Ask a web-grounded question via the Perplexity Agent API (`/v1/responses` alias of `/v1/agent`). */
export async function ask<T = unknown>(
  input: CreateParams['input'],
  opts: AskOptions = {},
): Promise<AskResult<T>> {
  const res = await getClient().responses.create(
    { ...buildRequest(input, opts), stream: false },
    { signal: opts.signal },
  );
  if (res.status === 'failed' || res.error) {
    throw new Error(`Agent response failed: ${res.error?.message ?? res.status}`);
  }
  const result: AskResult<T> = {
    id: res.id,
    model: res.model,
    text: res.output_text,
    citations: extractCitations(res.output),
    sources: extractSources(res.output),
    usage: res.usage,
  };
  if (opts.jsonSchema) result.json = JSON.parse(res.output_text) as T;
  return result;
}

export { Perplexity };

// Minimal real request. Prints only status and response shape — never the key.
import { getClient, Perplexity } from './agent.js';

try {
  const { data, response } = await getClient()
    .responses.create({ input: 'Reply with the single word: ok', effort: 'low', max_output_tokens: 32, stream: false })
    .withResponse();
  console.log('HTTP', response.status);
  console.log({
    keys: Object.keys(data).sort(),
    status: data.status,
    model: data.model,
    outputTypes: data.output.map((o) => o.type),
    output_text_length: data.output_text.length,
  });
} catch (err) {
  if (err instanceof Perplexity.APIError) {
    console.log('HTTP', err.status, err.name, 'retry-after:', err.headers?.get?.('retry-after') ?? null);
    process.exit(1);
  }
  console.log((err as Error).name + ': ' + (err as Error).message);
  process.exit(1);
}

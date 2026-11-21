import { ask, MissingApiKeyError, Perplexity } from './agent.js';

const args = process.argv.slice(2);
const flag = (name: string) => {
  const i = args.indexOf(`--${name}`);
  if (i === -1) return undefined;
  const [, v] = args.splice(i, 2);
  return v;
};
const model = flag('model');
const effort = flag('effort');
const previousResponseId = flag('previous');
const question = args.join(' ').trim();

if (!question) {
  console.error('Usage: npm run ask -- [--model <id>] [--effort <level>] [--previous <response_id>] "<question>"');
  process.exit(2);
}

try {
  const r = await ask(question, { model, effort, previousResponseId });
  console.log(r.text);
  const links = r.citations.length ? r.citations : r.sources;
  if (links.length) {
    console.log('\nSources:');
    links.forEach((s, i) => console.log(`  [${i + 1}] ${s.title ?? ''} ${s.url}`));
  }
  console.log(`\n(response id: ${r.id}, model: ${r.model})`);
} catch (err) {
  if (err instanceof MissingApiKeyError) console.error(err.message);
  else if (err instanceof Perplexity.AuthenticationError) console.error('401: API key rejected. Check or rotate it at https://console.perplexity.ai');
  else if (err instanceof Perplexity.RateLimitError) console.error('429: rate limited after retries. See https://docs.perplexity.ai/docs/admin/rate-limits-usage-tiers');
  else if (err instanceof Perplexity.APIError) console.error(`API error ${err.status}: ${err.message}`);
  else throw err;
  process.exit(1);
}

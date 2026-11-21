import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildRequest, extractCitations, extractSources, type Perplexity } from './agent.js';

test('buildRequest defaults to web_search with low effort', () => {
  const r = buildRequest('hi');
  assert.deepEqual(r.tools, [{ type: 'web_search' }]);
  assert.equal(r.effort, 'low');
  assert.equal(r.model, undefined);
});

test('buildRequest maps model, multi-turn and structured output', () => {
  const r = buildRequest('hi', {
    model: 'openai/gpt-5.6-sol',
    previousResponseId: 'resp_1',
    jsonSchema: { name: 'x', schema: { type: 'object' } },
  });
  assert.equal(r.model, 'openai/gpt-5.6-sol');
  assert.equal(r.effort, undefined);
  assert.equal(r.previous_response_id, 'resp_1');
  assert.deepEqual(r.response_format, { type: 'json_schema', json_schema: { name: 'x', schema: { type: 'object' } } });
});

test('extracts citations and sources from output', () => {
  const output = [
    { type: 'search_results', results: [{ id: 1, title: 'A', url: 'https://a', snippet: 's' }] },
    {
      type: 'message', id: 'm', role: 'assistant', status: 'completed',
      content: [{ type: 'output_text', text: 't', annotations: [{ url: 'https://a', title: 'A' }, { url: 'https://a' }] }],
    },
  ] as unknown as Perplexity.OutputItem[];
  assert.deepEqual(extractCitations(output), [{ url: 'https://a', title: 'A' }]);
  assert.equal(extractSources(output)[0]?.url, 'https://a');
});

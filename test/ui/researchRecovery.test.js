import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('research UI exposes integrity progress, safe retry, and source provenance', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="research-load-status"[^>]+role="status"/);
  assert.match(script, /new AbortController/);
  assert.match(script, /attempt !== researchLoadAttempt/);
  assert.match(script, /data-retry-release/);
  assert.match(script, /No partial shard data is shown/);
  assert.match(script, /partial or unverified data is never presented as trustworthy/);
});

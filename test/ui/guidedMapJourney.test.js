import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('packing map guides a selection into shareable evidence discovery', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8')
  ]);

  for (const example of ['Exact right-triangle grid', 'Dense acute packing', 'Open obtuse case']) {
    assert.match(html, new RegExp(example));
  }
  assert.match(html, /aria-label="Next steps for selected packing"/);
  assert.match(html, /Inspect this result’s evidence/);
  assert.match(html, /Find similar verified results/);
  assert.match(html, /id="map-share-status"[^>]+aria-live="polite"/);
  assert.match(script, /formatMapHash\(currentMapState\(\)\)/);
  assert.match(script, /applyMapState\(parseMapHash\(location\.hash\)\)/);
  assert.match(script, /formatResearchHash/);
  assert.match(script, /navigator\.clipboard\.writeText/);
});

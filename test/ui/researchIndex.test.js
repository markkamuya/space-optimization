import assert from 'node:assert/strict';
import test from 'node:test';
import release from '../../public/atlas-v2.json' with { type: 'json' };
import { buildResearchIndex, filterResearchIndex } from '../../src/ui/researchIndex.js';
import { readFile } from 'node:fs/promises';

const index = buildResearchIndex(release.records);

test('indexed research filtering preserves canonical order and combined substring behavior', () => {
  assert.deepEqual(filterResearchIndex(index, { query: 'right 90 1.5' }).map(record => record.id), ['iso-a90-r1p5']);
  assert.equal(filterResearchIndex(index, { query: 'lattice', family: 'equilateral' }).length, 16);
  assert.equal(filterResearchIndex(index, { evidence: 'proven_optimal' }).length, 3);
});

test('indexed research filtering safely handles short, absent, and empty queries', () => {
  assert.equal(filterResearchIndex(index, { query: '90' }).some(record => record.id === 'iso-a90-r1p5'), true);
  assert.equal(filterResearchIndex(index, { query: 'not-a-real-record' }).length, 0);
  assert.equal(filterResearchIndex(index).length, release.records.length);
});

test('research search coalesces rapid input and keeps each DOM render bounded', async () => {
  const script = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');
  assert.match(script, /cancelAnimationFrame\(researchRenderFrame\)/);
  assert.match(script, /scheduleResearchExplorerRender\(\)/);
  assert.match(script, /records\.slice\(0, researchLimit\)/);
  assert.match(script, /let researchLimit = 24/);
});

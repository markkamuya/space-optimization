import assert from 'node:assert/strict';
import test from 'node:test';
import { buildResearchTrail, researchTrailSummary } from '../../src/ui/researchTrail.js';

test('research trail preserves geometry, filters, record, and comparison in order', () => {
  const trail = buildResearchTrail({
    map: { angle: 50, ratio: 1.95 },
    research: { query: 'vertical', family: 'isosceles', evidence: 'verified_best_known' },
    activeRecord: 'iso-a50-r1p95',
    comparison: { left: 'iso-a50-r1p95', right: 'iso-a90-r0p75' },
    includeComparison: true,
    verified: true
  });
  assert.deepEqual(trail.steps.map(step => step.id), ['problem', 'filters', 'record', 'comparison']);
  assert.match(trail.steps[1].value, /vertical.*isosceles.*verified best known/);
  assert.match(researchTrailSummary(trail), /iso-a50-r1p95 vs iso-a90-r0p75/);
});

test('unverified context is visible but cannot become a shareable evidence summary', () => {
  const trail = buildResearchTrail({ map: {}, research: {}, comparison: {}, verified: false });
  assert.match(trail.status, /Context only/);
  assert.equal(researchTrailSummary(trail), null);
});

test('production UI renders and can reset the complete trail', async () => {
  const { readFile } = await import('node:fs/promises');
  const [html, script] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="research-trail"/);
  assert.match(html, /id="research-trail-reset"/);
  assert.match(script, /function renderResearchTrail\(\)/);
  assert.match(script, /applyComparisonState\(comparisonDefaults\(\)\)/);
});

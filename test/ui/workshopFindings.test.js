import assert from 'node:assert/strict';
import test from 'node:test';
import atlas from '../../public/atlas-v2.json' with { type: 'json' };
import { createWorkshopCandidate, updateWorkshopPlacement, validateWorkshopCandidate } from '../../src/ui/packingWorkshop.js';
import { buildWorkshopFindings } from '../../src/ui/workshopFindings.js';

const baseline = atlas.records.find(record => record.id === 'iso-a35-r2p55');

test('out-of-bounds diagnostics identify only demonstrably affected triangles', () => {
  const candidate = updateWorkshopPlacement(createWorkshopCandidate(baseline), 0, { x: -100 });
  const validation = validateWorkshopCandidate(candidate, baseline, atlas.records);
  const result = buildWorkshopFindings(validation, candidate, baseline);
  assert.equal(result.findings.some(item => item.code === 'OUT_OF_BOUNDS' && item.placementIndex === 0), true);
  assert.equal(result.findings.some(item => item.code === 'OUT_OF_BOUNDS' && item.placementIndex === 1), false);
  assert.equal(result.findings.find(item => item.code === 'OUT_OF_BOUNDS').canRestore, true);
});

test('structured placement paths remain actionable while unknown errors stay global', () => {
  const validation = { preflight: { checks: [] }, assessment: { verification: { errors: [
    { code: 'INVALID_PLACEMENT', message: 'Bad angle', path: 'solution.placements.2.angle' },
    { code: 'UNKNOWN', message: 'Global issue', path: 'solution' }
  ] } } };
  const { findings } = buildWorkshopFindings(validation, null);
  assert.equal(findings[0].placementIndex, 2);
  assert.equal(findings[1].placementIndex, null);
});

test('diagnostics remain bounded for large invalid candidates', () => {
  const candidate = createWorkshopCandidate(baseline);
  candidate.solution.placements = candidate.solution.placements.map(placement => ({ ...placement, x: -100 }));
  const validation = validateWorkshopCandidate(candidate, baseline, atlas.records);
  const result = buildWorkshopFindings(validation, candidate, null, 10);
  assert.equal(result.findings.length, 10);
  assert.equal(result.truncated, true);
});

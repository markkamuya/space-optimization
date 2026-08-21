import assert from 'node:assert/strict';
import test from 'node:test';
import atlas from '../../public/atlas-v2.json' with { type: 'json' };
import {
  addWorkshopPiece,
  createWorkshopBundle,
  createWorkshopCandidate,
  formatWorkshopHash,
  parseWorkshopHash,
  removeWorkshopPiece,
  restoreWorkshopBundle,
  updateWorkshopPlacement,
  validateWorkshopCandidate
} from '../../src/ui/packingWorkshop.js';

const baseline = atlas.records.find(record => record.id === 'iso-a35-r2p55');
const release = { version: atlas.version, releasedAt: atlas.releasedAt };
const integrity = { digest: 'a'.repeat(64) };
const source = 'verified_shards';

test('workshop starts from exact verified coordinates without promoting evidence', () => {
  const candidate = createWorkshopCandidate(baseline, { createdAt: '2026-08-20T00:00:00.000Z' });
  assert.deepEqual(candidate.problem, baseline.problem);
  assert.deepEqual(candidate.solution.placements, baseline.solution.placements);
  assert.notEqual(candidate.problem, baseline.problem);
  assert.equal(candidate.evidence.status, 'candidate');
  const validation = validateWorkshopCandidate(candidate, baseline, atlas.records);
  assert.equal(validation.geometryValid, true);
  assert.equal(validation.assessment.disposition, 'reject_duplicate');
  assert.equal(validation.eligibleForContribution, false);
  assert.match(validation.boundary, /published incumbent is unchanged/i);
});

test('coordinate edits and piece inventory changes stay synchronized and bounded', () => {
  const candidate = createWorkshopCandidate(baseline);
  const edited = updateWorkshopPlacement(candidate, 0, { x: 0.125, y: 0.25, angle: 3, reflect: false });
  assert.deepEqual(edited.solution.placements[0], { x: 0.125, y: 0.25, angle: 3, reflect: false });
  assert.notDeepEqual(edited.solution.placements[0], candidate.solution.placements[0]);
  assert.throws(() => addWorkshopPiece(edited), /at most 300 pieces/i);
  const reduced = removeWorkshopPiece(edited, edited.solution.placements.length - 1);
  const expanded = addWorkshopPiece(reduced);
  assert.equal(expanded.problem.triangles.length, edited.problem.triangles.length);
  assert.equal(expanded.solution.placements.length, edited.solution.placements.length);
  assert.throws(() => updateWorkshopPlacement(candidate, -1, { x: 0 }), /outside/i);
});

test('validation fails closed for invalid geometry and strips inflated evidence', () => {
  const candidate = createWorkshopCandidate(baseline);
  candidate.evidence = { status: 'proven_optimal', proof: { type: 'area_bound' } };
  const invalid = updateWorkshopPlacement(candidate, 0, { x: -100 });
  const validation = validateWorkshopCandidate(invalid, baseline, atlas.records);
  assert.equal(validation.candidate.evidence.status, 'candidate');
  assert.equal(validation.geometryValid, false);
  assert.equal(validation.eligibleForContribution, false);
  assert.match(validation.headline, /geometry check failed/i);
});

test('checksummed workshop bundles recover only against the exact release and baseline', async () => {
  const candidate = createWorkshopCandidate(baseline, { createdAt: '2026-08-20T00:00:00.000Z' });
  const validation = validateWorkshopCandidate(candidate, baseline, atlas.records);
  const bundle = await createWorkshopBundle({ candidate, baseline, validation, release, integrity, source, exportedAt: '2026-08-20T01:00:00.000Z' });
  assert.match(bundle.checksum, /^sha256:[0-9a-f]{64}$/);
  assert.equal(bundle.candidate.evidence.status, 'candidate');
  const restored = await restoreWorkshopBundle(JSON.stringify(bundle), baseline, release, integrity, source);
  assert.equal(restored.valid, true);
  assert.deepEqual(restored.candidate.solution.placements, candidate.solution.placements);
  const changedRelease = await restoreWorkshopBundle(JSON.stringify(bundle), baseline, { ...release, version: 'next' }, integrity, source);
  assert.equal(changedRelease.valid, false);
  assert.match(changedRelease.issues.join(' '), /different verified release/i);
  bundle.candidate.solution.placements[0].x += 1;
  const tampered = await restoreWorkshopBundle(JSON.stringify(bundle), baseline, release, integrity, source);
  assert.equal(tampered.valid, false);
  assert.match(tampered.issues.join(' '), /checksum/i);
});

test('workshop deep links are bounded and round-trip safely', () => {
  assert.deepEqual(parseWorkshopHash(formatWorkshopHash('iso-a35-r2p55')), { record: 'iso-a35-r2p55' });
  assert.deepEqual(parseWorkshopHash('#workshop?record=%3Cscript%3E'), { record: null });
  assert.deepEqual(parseWorkshopHash('#research?record=iso-a35-r2p55'), { record: null });
});

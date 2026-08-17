import assert from 'node:assert/strict';
import test from 'node:test';
import release from '../../public/atlas-v2.json' with { type: 'json' };
import { buildComparisonGuides, comparisonMatchMessage, filterComparisonCandidates } from '../../src/ui/comparisonFinder.js';

test('comparison finder searches canonical scientific fields with combined tokens', () => {
  assert.equal(filterComparisonCandidates(release.records, 'right 90 1.5').some(record => record.id === 'iso-a90-r1p5'), true);
  assert.equal(filterComparisonCandidates(release.records, 'rectangular pairs').length, 16);
  assert.equal(filterComparisonCandidates(release.records, 'proven_optimal').length, 3);
});

test('guided comparisons are deterministic and evidence-safe', () => {
  const guides = buildComparisonGuides(release.records, 'iso-a75-r2p4');
  assert.deepEqual(guides.map(guide => guide.id), ['exact-vs-open', 'change-container', 'change-triangle']);
  const exact = guides[0];
  assert.equal(release.records.find(record => record.id === exact.left).evidence.state, 'proven_optimal');
  assert.notEqual(release.records.find(record => record.id === exact.right).evidence.state, 'proven_optimal');
  const container = guides[1];
  const left = release.records.find(record => record.id === container.left);
  const right = release.records.find(record => record.id === container.right);
  assert.equal(left.family, right.family);
  assert.equal(left.parameters.apexAngle, right.parameters.apexAngle);
  assert.notEqual(left.parameters.rectangleRatio, right.parameters.rectangleRatio);
});

test('comparison finder supports identifiers and recovers from no matches', () => {
  assert.deepEqual(filterComparisonCandidates(release.records, 'iso-a75-r2p4').map(record => record.id), ['iso-a75-r2p4']);
  assert.equal(filterComparisonCandidates(release.records, 'not-a-real-record').length, 0);
  assert.equal(comparisonMatchMessage({ matches: 0, total: 304, retained: true }), 'No other verified records match. The current result is retained.');
});

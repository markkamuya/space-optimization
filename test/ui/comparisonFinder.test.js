import assert from 'node:assert/strict';
import test from 'node:test';
import release from '../../public/atlas-v2.json' with { type: 'json' };
import { comparisonMatchMessage, filterComparisonCandidates } from '../../src/ui/comparisonFinder.js';

test('comparison finder searches canonical scientific fields with combined tokens', () => {
  assert.equal(filterComparisonCandidates(release.records, 'right 90 1.5').some(record => record.id === 'iso-a90-r1p5'), true);
  assert.equal(filterComparisonCandidates(release.records, 'rectangular pairs').length, 16);
  assert.equal(filterComparisonCandidates(release.records, 'proven_optimal').length, 3);
});

test('comparison finder supports identifiers and recovers from no matches', () => {
  assert.deepEqual(filterComparisonCandidates(release.records, 'iso-a75-r2p4').map(record => record.id), ['iso-a75-r2p4']);
  assert.equal(filterComparisonCandidates(release.records, 'not-a-real-record').length, 0);
  assert.equal(comparisonMatchMessage({ matches: 0, total: 304, retained: true }), 'No other verified records match. The current result is retained.');
});

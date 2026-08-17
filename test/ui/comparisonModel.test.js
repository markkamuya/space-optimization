import assert from 'node:assert/strict';
import test from 'node:test';
import release from '../../public/atlas-v2.json' with { type: 'json' };
import { compareCanonicalRecords, comparisonOptionLabel } from '../../src/ui/comparisonModel.js';

test('canonical comparison exposes exact signed scientific deltas', () => {
  const left = release.records.find(record => record.id === 'iso-a90-r1p5');
  const right = release.records.find(record => record.id === 'iso-a110-r3');
  const comparison = compareCanonicalRecords(left, right);
  assert.equal(comparison.utilizationDelta, right.verification.utilization - left.verification.utilization);
  assert.equal(comparison.gapDelta, right.bounds.optimalityGap - left.bounds.optimalityGap);
  assert.equal(comparison.pieceDelta, right.verification.pieceCount - left.verification.pieceCount);
  assert.equal(comparison.higherFill, 'left');
  assert.equal(comparison.smallerGap, 'left');
});

test('comparison labels identify family, shape, ratio, and verified fill', () => {
  const record = release.records.find(item => item.id === 'iso-a90-r1p5');
  assert.equal(comparisonOptionLabel(record), 'right · 90° · 1.5:1 · 100.0%');
});

test('legacy or malformed records cannot enter canonical comparison', () => {
  assert.throws(() => compareCanonicalRecords({ id: 'legacy' }, release.records[0]), /canonical verified release/);
});

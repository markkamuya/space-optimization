import assert from 'node:assert/strict';
import test from 'node:test';
import { validatePublicRelease } from '../../src/ui/releaseValidation.js';

const record = {
  id: 'verified-record',
  problem: { width: 1, height: 1 },
  solution: { placements: [] },
  verification: { valid: true, utilization: 0 },
  bounds: { optimalityGap: 1 }
};

test('public release validation accepts the required rendering contract', () => {
  assert.equal(validatePublicRelease({ records: [record], transitions: [], coverage: {} }).valid, true);
});

test('public release validation rejects unverified and incomplete records', () => {
  const report = validatePublicRelease({
    records: [{ ...record, verification: { valid: false, utilization: 0 } }, {}],
    transitions: []
  });
  assert.equal(report.valid, false);
  assert.ok(report.errors.includes('coverage_missing'));
  assert.ok(report.errors.includes('record_unverified:0'));
  assert.ok(report.errors.includes('record_geometry_missing:1'));
  assert.ok(report.errors.includes('record_metric_invalid:1'));
});

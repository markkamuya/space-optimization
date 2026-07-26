import assert from 'node:assert/strict';
import test from 'node:test';
import { ATLAS_RECORDS } from '../../src/atlas/catalog.js';
import { assessSubmission } from '../../src/atlas/submission.js';

function asCandidate(record, overrides = {}) {
  return {
    format: 'triangle-packing-atlas/v1',
    id: `${record.id}-candidate`,
    problem: record.problem,
    solution: record.solution,
    evidence: { status: 'candidate' },
    provenance: {
      generator: 'test',
      contributor: 'Test contributor',
      createdAt: '2026-07-26T00:00:00.000Z'
    },
    ...overrides
  };
}

test('submission assessment detects an existing packing fingerprint', () => {
  const report = assessSubmission(asCandidate(ATLAS_RECORDS[0]), ATLAS_RECORDS);
  assert.equal(report.schema.valid, true);
  assert.equal(report.verification.valid, true);
  assert.equal(report.disposition, 'reject_duplicate');
  assert.equal(report.comparison.duplicateOf, ATLAS_RECORDS[0].id);
});

test('proof claims are flagged for human review', () => {
  const record = ATLAS_RECORDS[0];
  const report = assessSubmission(asCandidate(record, {
    solution: {
      ...record.solution,
      placements: record.solution.placements.map((placement, index) =>
        index === 0 ? { ...placement, x: placement.x + 0.01 } : placement)
    },
    evidence: { status: 'proven_optimal', proof: { type: 'submitted proof' } }
  }), []);
  assert.equal(report.humanReviewRequired, true);
});

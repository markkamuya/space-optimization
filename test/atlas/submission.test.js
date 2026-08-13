import assert from 'node:assert/strict';
import test from 'node:test';
import { ATLAS_RECORDS } from '../../src/atlas/catalog.js';
import {
  buildVerifiedIncumbentIndex,
  loadPublishedRecords,
  validatePublishedRelease
} from '../../src/atlas/published.js';
import { assessSubmission, packingProblemIdentity } from '../../src/atlas/submission.js';
import { RESEARCH_RECORDS } from '../../src/research/dataset.js';

function asCandidate(record, overrides = {}) {
  return {
    format: 'triangle-packing-atlas/v1',
    id: `${record.id}-candidate`,
    problem: record.problem,
    solution: record.solution,
    evidence: { status: 'candidate' },
    provenance: {
      generator: 'test',
      version: '1.0.0',
      seed: 'test-seed',
      runtimeMs: 0,
      contributor: 'Test contributor',
      license: 'CC-BY-4.0',
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

test('recognized optimal proof enters human review after automated verification', () => {
  const record = ATLAS_RECORDS.find(candidate =>
    candidate.status === 'proven_optimal' && candidate.verification.utilization === 1);
  const report = assessSubmission(asCandidate(record, {
    evidence: {
      status: 'proven_optimal',
      proof: { type: 'area_bound', statement: 'Construction attains the area bound.' }
    }
  }), []);
  assert.equal(report.schema.valid, true);
  assert.equal(report.verification.valid, true);
  assert.equal(report.disposition, 'new_problem');
  assert.equal(report.humanReviewRequired, true);
});

test('problem identity distinguishes reflection and rotation permissions', () => {
  const problem = ATLAS_RECORDS[0].problem;
  assert.notEqual(
    packingProblemIdentity(problem),
    packingProblemIdentity({ ...problem, allowReflection: !problem.allowReflection })
  );
  assert.notEqual(
    packingProblemIdentity(problem),
    packingProblemIdentity({ ...problem, allowRotation: !problem.allowRotation })
  );
});

test('problem identity preserves heterogeneous inventory multiplicity', () => {
  const base = ATLAS_RECORDS[0].problem;
  const first = { id: 'A', sides: [1, 1, Math.SQRT2] };
  const second = { id: 'B', sides: [1, 1, 1] };
  const left = { ...base, triangles: [first, second] };
  const right = { ...base, triangles: [first, second, { ...second, id: 'C' }] };
  assert.notEqual(packingProblemIdentity(left), packingProblemIdentity(right));
});

test('homogeneous experiment identity permits a higher piece-count challenger', () => {
  const base = ATLAS_RECORDS[0].problem;
  const triangle = base.triangles[0];
  assert.equal(
    packingProblemIdentity({ ...base, triangles: [triangle] }),
    packingProblemIdentity({ ...base, triangles: [triangle, { ...triangle, id: 'extra' }] })
  );
});

test('submission comparison uses adaptive canonical incumbents', async () => {
  const published = await loadPublishedRecords();
  const improved = published.find(record => record.adaptiveImprovement);
  assert.ok(improved, 'canonical release should include an adaptive incumbent');
  const staleBaseline = RESEARCH_RECORDS.find(record => record.id === improved.id);
  assert.ok(staleBaseline.verification.utilization < improved.verification.utilization);

  const report = assessSubmission(asCandidate(staleBaseline), published);
  assert.equal(report.disposition, 'reject_inferior');
  assert.equal(report.comparison.bestKnownId, improved.id);
  assert.ok(report.comparison.improvement < 0);
});

test('published incumbents are independently replayed before comparison', async () => {
  const published = await loadPublishedRecords();
  const canonical = published.find(record => typeof record.experimentId === 'string');
  const tampered = structuredClone(canonical);
  tampered.solution.placements[0].x += 0.01;
  assert.throws(
    () => validatePublishedRelease({ format: 'triangle-packing-atlas/v2', records: [tampered] }),
    /failed independent replay/
  );
});

test('verified incumbent index maps fingerprints and problem identities', async () => {
  const records = await loadPublishedRecords();
  const index = buildVerifiedIncumbentIndex(records);
  const record = records[0];
  assert.equal(index.verified, true);
  assert.equal(index.byFingerprint.get(record.verification.fingerprint), record);
  assert.ok(index.byProblem.get(packingProblemIdentity(record.problem)).includes(record));
  assert.ok(Object.isFrozen(index.records));
});

test('malformed submissions are rejected without crashing identity comparison', () => {
  const report = assessSubmission({
    format: 'triangle-packing-atlas/v1',
    id: 'missing-problem',
    solution: { construction: 'invalid', placements: [] },
    evidence: { status: 'candidate' },
    provenance: { generator: 'test', createdAt: new Date(0).toISOString() }
  }, []);
  assert.equal(report.disposition, 'reject_invalid');
  assert.deepEqual(report.comparison.comparableRecords, []);
  assert.ok(report.schema.errors.some(error => error.path === 'problem'));
});

test('submission comparison quarantines malformed published incumbents', () => {
  const candidate = asCandidate(ATLAS_RECORDS[0]);
  const report = assessSubmission(candidate, [
    null,
    { verification: { valid: true, fingerprint: 'forged', utilization: 1 }, problem: null },
    ATLAS_RECORDS[0]
  ]);
  assert.equal(report.disposition, 'reject_duplicate');
  assert.equal(report.comparison.duplicateOf, ATLAS_RECORDS[0].id);
  assert.equal(report.comparison.quarantinedIncumbents, 2);
});

test('submissions require reproducible solver provenance', () => {
  const record = ATLAS_RECORDS[0];
  const report = assessSubmission(asCandidate(record, {
    provenance: {
      generator: 'solver',
      version: '',
      seed: Number.NaN,
      runtimeMs: -1,
      contributor: 'Test contributor',
      license: 'CC-BY-4.0',
      createdAt: '2026-07-26T00:00:00.000Z'
    }
  }), []);
  assert.equal(report.disposition, 'reject_invalid');
  for (const path of ['provenance.version', 'provenance.seed', 'provenance.runtimeMs']) {
    assert.ok(report.schema.errors.some(error => error.path === path));
  }
});

test('submissions require attribution and the atlas data license', () => {
  const record = ATLAS_RECORDS[0];
  const report = assessSubmission(asCandidate(record, {
    provenance: {
      generator: 'solver',
      version: '1.0.0',
      seed: 'licensed-seed',
      runtimeMs: 1,
      contributor: ' ',
      license: 'custom',
      createdAt: '2026-07-26T00:00:00.000Z'
    }
  }), []);
  assert.equal(report.disposition, 'reject_invalid');
  assert.ok(report.schema.errors.some(error => error.path === 'provenance.contributor'));
  assert.ok(report.schema.errors.some(error => error.path === 'provenance.license'));
});

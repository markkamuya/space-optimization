import assert from 'node:assert/strict';
import test from 'node:test';
import { verifyPacking } from '../../src/atlas/verifier.js';
import { RESEARCH_RECORDS, RESEARCH_RELEASE, nearestRecord } from '../../src/research/dataset.js';

test('research release contains a dense verified parameter grid', () => {
  assert.equal(RESEARCH_RELEASE.recordCount, 304);
  assert.equal(RESEARCH_RELEASE.verifiedCount, 304);
  assert.equal(RESEARCH_RELEASE.sampling.isoscelesApexAngles.length, 16);
  assert.equal(RESEARCH_RELEASE.sampling.rectangleRatios.length, 16);
  assert.equal(RESEARCH_RECORDS.filter(record => record.family === 'scalene').length, 48);
});

test('every research claim has replayable coordinates, provenance, trace, and bounds', () => {
  for (const record of RESEARCH_RECORDS) {
    const verification = verifyPacking(record.problem, record.solution.placements);
    assert.equal(verification.valid, true, record.id);
    assert.equal(verification.fingerprint, record.verification.fingerprint, record.id);
    assert.ok(record.provenance.contributor, record.id);
    assert.ok(record.solver.portfolio.length >= 3, record.id);
    assert.ok(record.solver.portfolio.some(entry => entry.solver === 'boundary-local-search'), record.id);
    assert.ok(record.solver.portfolio.some(entry => entry.solver === 'deterministic-evolutionary-orientation'), record.id);
    assert.ok(record.solver.portfolio.some(entry => entry.solver === 'discrete-orientation-constraint'), record.id);
    assert.ok(record.descriptors.boundaryGapAnalysis.priority, record.id);
    assert.equal(record.bounds.lowerBound, record.verification.utilization, record.id);
    assert.ok(record.bounds.upperBound + 1e-9 >= record.bounds.lowerBound, record.id);
  }
});

test('nearest-record lookup reports computed evidence around transitions', () => {
  const nearest = nearestRecord(RESEARCH_RECORDS, 61, 1.49);
  assert.equal(nearest.record.parameters.apexAngle, 60);
  assert.equal(nearest.record.parameters.rectangleRatio, 1.5);
  assert.ok(nearest.distance > 0);
});

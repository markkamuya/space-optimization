import assert from 'node:assert/strict';
import test from 'node:test';
import { ATLAS_RECORDS, ATLAS_RELEASE, OPEN_PROBLEMS, phaseAt } from '../../src/atlas/catalog.js';
import { verifyPacking } from '../../src/atlas/verifier.js';

test('release 1 publishes only independently valid coordinate records', () => {
  assert.ok(ATLAS_RECORDS.length >= 7);
  for (const record of ATLAS_RECORDS) {
    const result = verifyPacking(record.problem, record.solution.placements);
    assert.equal(result.valid, true, record.id);
    assert.equal(result.fingerprint, record.verification.fingerprint);
    assert.ok(record.provenance.contributor);
  }
  assert.equal(ATLAS_RELEASE.recordCount, ATLAS_RECORDS.length);
});

test('open problems remain separate from published coordinate records', () => {
  assert.ok(OPEN_PROBLEMS.length >= 4);
  assert.ok(OPEN_PROBLEMS.every(problem => problem.status === 'open'));
});

test('phase map exposes evidence-aware pattern transitions', () => {
  assert.equal(phaseAt(90, 1).name, 'rectangular pairs');
  assert.equal(phaseAt(60, 1).status, 'verified construction');
  assert.notEqual(phaseAt(45, 1).name, phaseAt(90, 1).name);
  assert.match(phaseAt(70, 1.5).status, /hypothesis|open/);
});

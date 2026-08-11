import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_RECORDS } from '../../src/research/dataset.js';
import {
  canonicalRecord,
  compareCandidate,
  detectPhaseTransitions,
  experimentId,
  validateCanonicalRecords,
  verificationCertificate
} from '../../src/research/registry.js';

const records = RESEARCH_RECORDS.map(canonicalRecord);

test('canonical registry is unique, certified, and reproducible', () => {
  const audit = validateCanonicalRecords(records);
  assert.equal(audit.valid, true);
  assert.equal(audit.uniqueExperiments, records.length);
  assert.ok(records.every(record => record.verification.certificate.startsWith('sha256:')));
  assert.ok(records.every(record => record.reproducibility.command.includes(record.id)));
});

test('canonical registry rejects stale verification certificates', () => {
  const record = structuredClone(records[0]);
  record.verification.certificate = 'sha256:forged';
  const result = validateCanonicalRecords([record]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === 'CERTIFICATE_DRIFT'));
});

test('canonical registry rejects a stored experiment identity that drifts from parameters', () => {
  const record = structuredClone(records[0]);
  record.experimentId = 'isosceles/apex-999/rectangle-999';
  const result = validateCanonicalRecords([record]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === 'EXPERIMENT_ID_DRIFT'));
});

test('canonical registry rejects multiple incumbents for one experiment', () => {
  const original = records[0];
  const duplicate = structuredClone(original);
  duplicate.id = `${original.id}-duplicate`;
  duplicate.verification.certificate = verificationCertificate(
    duplicate.id,
    duplicate.verification.fingerprint,
    duplicate.verification.utilization
  );
  const result = validateCanonicalRecords([original, duplicate]);
  assert.equal(result.valid, false);
  assert.ok(result.errors.some(error => error.code === 'DUPLICATE_EXPERIMENT'));
});

test('stable experiment ids encode family, shape, and container', () => {
  assert.equal(experimentId(RESEARCH_RECORDS[0]), 'isosceles/apex-35/rectangle-0.75');
});

test('phase transitions carry two source records', () => {
  assert.ok(detectPhaseTransitions(records).every(transition => transition.evidence.length === 2));
});

test('candidate comparison rejects duplicate fingerprints', () => {
  assert.deepEqual(compareCandidate(records[0], records), {
    decision: 'duplicate',
    incumbent: records[0].id,
    delta: 0
  });
});

test('candidate comparison rejects a forged utilization claim', () => {
  const candidate = structuredClone(records[0]);
  candidate.verification.utilization += 0.1;
  const result = compareCandidate(candidate, records.slice(1));
  assert.equal(result.decision, 'invalid_claim');
  assert.ok(result.errors.includes('utilization_mismatch'));
});

test('candidate comparison derives experiment identity instead of trusting the claim', () => {
  const candidate = structuredClone(records[0]);
  candidate.experimentId = 'isosceles/apex-999/rectangle-999';
  const result = compareCandidate(candidate, records.slice(1));
  assert.equal(result.decision, 'invalid_claim');
  assert.ok(result.errors.includes('experiment_id_mismatch'));
});

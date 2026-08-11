import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_RECORDS } from '../../src/research/dataset.js';
import { canonicalRecord } from '../../src/research/registry.js';
import { auditRecords } from '../../src/research/audit.js';

test('scientific audit independently replays the canonical registry', () => {
  const report = auditRecords(RESEARCH_RECORDS.map(canonicalRecord));
  assert.equal(report.passed, true);
  assert.equal(report.summary.records, 304);
  assert.equal(report.summary.replayed, 304);
  assert.equal(report.summary.critical, 0);
  assert.equal(report.summary.major, 0);
});

test('scientific audit catches evidence that exceeds its bound support', () => {
  const record = canonicalRecord(RESEARCH_RECORDS.find(item => item.bounds.optimalityGap > 0));
  record.evidence.state = 'proven_optimal';
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'EVIDENCE_BOUND_MISMATCH'));
});

test('scientific audit catches a forged verification certificate', () => {
  const record = canonicalRecord(RESEARCH_RECORDS[0]);
  record.verification.certificate = 'sha256:forged';
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'CERTIFICATE_DRIFT'));
});

test('scientific audit catches experiment identity drift', () => {
  const record = canonicalRecord(RESEARCH_RECORDS[0]);
  record.experimentId = 'isosceles/apex-999/rectangle-999';
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'EXPERIMENT_ID_DRIFT'));
});

test('scientific audit catches duplicate canonical experiments', () => {
  const original = canonicalRecord(RESEARCH_RECORDS[0]);
  const duplicate = canonicalRecord({
    ...RESEARCH_RECORDS[0],
    id: `${RESEARCH_RECORDS[0].id}-duplicate`
  });
  const report = auditRecords([original, duplicate]);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'DUPLICATE_EXPERIMENT'));
});

test('scientific audit recomputes lower bounds and optimality gaps', () => {
  const record = canonicalRecord(RESEARCH_RECORDS.find(item => item.bounds.optimalityGap > 0));
  record.bounds.lowerBound += 0.01;
  record.bounds.optimalityGap = 0;
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'LOWER_BOUND_DRIFT'));
  assert.ok(report.findings.some(finding => finding.code === 'OPTIMALITY_GAP_DRIFT'));
});

test('scientific audit requires an upper bound supported by a rigorous method', () => {
  const record = canonicalRecord(RESEARCH_RECORDS[0]);
  record.bounds.upperBound -= 0.01;
  record.bounds.optimalityGap = Math.max(0, record.bounds.upperBound - record.bounds.lowerBound);
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'UNSUPPORTED_UPPER_BOUND'));
});

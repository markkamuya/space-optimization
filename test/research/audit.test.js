import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_RECORDS } from '../../src/research/dataset.js';
import { canonicalRecord, detectPhaseTransitions } from '../../src/research/registry.js';
import { auditRecords } from '../../src/research/audit.js';
import { buildWorkQueue } from '../../src/research/distributed.js';
import { buildCommunityChallenges } from '../../src/research/challenges.js';
import { canonicalCoverage } from '../../src/research/release.js';
import { buildCanonicalCsv } from '../../src/research/exports.js';

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

test('scientific audit replays the claimed piece count', () => {
  const record = canonicalRecord(RESEARCH_RECORDS[0]);
  record.verification.pieceCount += 1;
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  const finding = report.findings.find(item => item.code === 'PIECE_COUNT_DRIFT');
  assert.ok(finding);
  assert.equal(finding.expected, record.solution.placements.length);
  assert.equal(finding.actual, record.verification.pieceCount);
});

test('scientific audit recomputes the published phase-transition index', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const transitions = detectPhaseTransitions(records);
  transitions[0] = { ...transitions[0], from: 'tampered pattern' };
  const report = auditRecords(records, { transitions });
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'TRANSITION_INDEX_DRIFT'));
});

test('scientific audit links reproduction metadata to solver provenance', () => {
  const record = canonicalRecord(RESEARCH_RECORDS[0]);
  record.reproducibility = {
    command: 'npm run atlas:experiment -- --record another-record',
    seed: 'tampered-seed',
    algorithmVersion: 'tampered-solver/v999',
    deterministic: false
  };
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  const finding = report.findings.find(item => item.code === 'REPRODUCIBILITY_DRIFT');
  assert.deepEqual(finding.fields, ['command', 'seed', 'algorithmVersion', 'deterministic']);
});

test('scientific audit recomputes the public distributed work queue', () => {
  const record = canonicalRecord(RESEARCH_RECORDS.find(item => item.bounds.optimalityGap > 0));
  const workQueue = buildWorkQueue([record]);
  workQueue[0] = { ...workQueue[0], baselineUtilization: 1 };
  const report = auditRecords([record], { workQueue });
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'WORK_QUEUE_DRIFT'));
});

test('scientific audit requires exactly one matching solver winner trace', () => {
  const record = structuredClone(canonicalRecord(RESEARCH_RECORDS[0]));
  record.solver.winner = 'nonexistent-solver';
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'SOLVER_WINNER_TRACE_INVALID'));
});

test('scientific audit links the winning solver result to replayed geometry', () => {
  const record = structuredClone(canonicalRecord(RESEARCH_RECORDS[0]));
  const winner = record.solver.portfolio.find(entry => entry.solver === record.solver.winner);
  winner.pieceCount += 1;
  winner.utilization = 1;
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'SOLVER_RESULT_DRIFT'));
});

test('scientific audit recomputes solver budget accounting', () => {
  const record = structuredClone(canonicalRecord(RESEARCH_RECORDS[0]));
  record.solver.budget.strategies += 1;
  record.solver.budget.orientationEvaluations += 1;
  record.solver.budget.adaptiveAttempts = 999;
  const report = auditRecords([record]);
  assert.equal(report.passed, false);
  const finding = report.findings.find(item => item.code === 'SOLVER_BUDGET_DRIFT');
  assert.deepEqual(finding.fields, ['strategies', 'orientationEvaluations', 'adaptiveAttempts']);
});

test('scientific audit recomputes the public challenge board', () => {
  const record = canonicalRecord(RESEARCH_RECORDS.find(item => item.bounds.optimalityGap > 0.1));
  const challenges = buildCommunityChallenges(buildWorkQueue([record]));
  challenges[0] = {
    ...challenges[0],
    baseline: { ...challenges[0].baseline, utilization: 1 }
  };
  const report = auditRecords([record], { challenges });
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'CHALLENGE_BOARD_DRIFT'));
});

test('scientific audit recomputes the release coverage summary', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const coverage = canonicalCoverage(records);
  coverage.provenOptimal += 1;
  const report = auditRecords(records, { coverage });
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'COVERAGE_SUMMARY_DRIFT'));
});

test('scientific audit recomputes the downloadable CSV export', () => {
  const record = canonicalRecord(RESEARCH_RECORDS[0]);
  const csv = buildCanonicalCsv([record]).replace(record.id, 'tampered-record');
  const report = auditRecords([record], { csv });
  assert.equal(report.passed, false);
  assert.ok(report.findings.some(finding => finding.code === 'CSV_EXPORT_DRIFT'));
});

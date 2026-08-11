import { verifyPacking } from '../atlas/verifier.js';
import { buildWorkQueue } from './distributed.js';
import {
  detectPhaseTransitions,
  experimentId,
  validateCanonicalRecords,
  verificationCertificate
} from './registry.js';

function key(record) {
  return `${record.family}:${record.parameters.apexAngle}`;
}

export function auditRecords(records, options = {}) {
  const discontinuityThreshold = options.discontinuityThreshold ?? 0.12;
  const registry = validateCanonicalRecords(records);
  const findings = [];
  const seenExperiments = new Map();
  let replayed = 0;

  for (const record of records) {
    if (record.experimentId !== experimentId(record)) {
      findings.push({
        severity: 'critical',
        code: 'EXPERIMENT_ID_DRIFT',
        recordId: record.id,
        expected: experimentId(record),
        actual: record.experimentId
      });
    }
    const duplicateExperiment = seenExperiments.get(record.experimentId);
    if (duplicateExperiment) {
      findings.push({
        severity: 'critical',
        code: 'DUPLICATE_EXPERIMENT',
        recordId: record.id,
        incumbent: duplicateExperiment,
        experimentId: record.experimentId
      });
    } else {
      seenExperiments.set(record.experimentId, record.id);
    }
    const replay = verifyPacking(record.problem, record.solution.placements);
    replayed += Number(replay.valid);
    if (!replay.valid) findings.push({ severity: 'critical', code: 'INVALID_GEOMETRY', recordId: record.id });
    if (replay.fingerprint !== record.verification.fingerprint) {
      findings.push({ severity: 'critical', code: 'FINGERPRINT_DRIFT', recordId: record.id });
    }
    if (Math.abs(replay.metrics.utilization - record.verification.utilization) > 1e-10) {
      findings.push({ severity: 'critical', code: 'METRIC_DRIFT', recordId: record.id });
    }
    if (!Number.isInteger(record.verification.pieceCount) ||
      record.verification.pieceCount !== record.solution.placements.length) {
      findings.push({
        severity: 'critical',
        code: 'PIECE_COUNT_DRIFT',
        recordId: record.id,
        expected: record.solution.placements.length,
        actual: record.verification.pieceCount
      });
    }
    const winnerEntries = record.solver.portfolio.filter(entry => entry.solver === record.solver.winner);
    if (winnerEntries.length !== 1) {
      findings.push({
        severity: 'critical',
        code: 'SOLVER_WINNER_TRACE_INVALID',
        recordId: record.id,
        winner: record.solver.winner,
        matchingEntries: winnerEntries.length
      });
    } else if (winnerEntries[0].pieceCount !== record.solution.placements.length ||
      !Number.isFinite(winnerEntries[0].utilization) ||
      Math.abs(winnerEntries[0].utilization - replay.metrics.utilization) > 1e-10) {
      findings.push({
        severity: 'critical',
        code: 'SOLVER_RESULT_DRIFT',
        recordId: record.id,
        winner: record.solver.winner
      });
    }
    if (!Number.isFinite(record.bounds.lowerBound) ||
      Math.abs(record.bounds.lowerBound - replay.metrics.utilization) > 1e-10) {
      findings.push({ severity: 'critical', code: 'LOWER_BOUND_DRIFT', recordId: record.id });
    }
    if (!Number.isFinite(record.bounds.upperBound) ||
      record.bounds.upperBound < record.bounds.lowerBound - 1e-10 ||
      record.bounds.upperBound > 1 + 1e-10) {
      findings.push({ severity: 'critical', code: 'INVALID_UPPER_BOUND', recordId: record.id });
    }
    const rigorousUpperBounds = record.bounds.methods
      .filter(method => method.rigorous && Number.isFinite(method.utilization))
      .map(method => method.utilization);
    if (rigorousUpperBounds.length === 0 ||
      Math.abs(Math.min(...rigorousUpperBounds) - record.bounds.upperBound) > 1e-10) {
      findings.push({ severity: 'critical', code: 'UNSUPPORTED_UPPER_BOUND', recordId: record.id });
    }
    const expectedGap = Math.max(0, record.bounds.upperBound - record.bounds.lowerBound);
    if (!Number.isFinite(record.bounds.optimalityGap) ||
      Math.abs(record.bounds.optimalityGap - expectedGap) > 1e-10) {
      findings.push({ severity: 'critical', code: 'OPTIMALITY_GAP_DRIFT', recordId: record.id });
    }
    if (record.verification.certificate !== verificationCertificate(
      record.id,
      record.verification.fingerprint,
      record.verification.utilization
    )) {
      findings.push({ severity: 'critical', code: 'CERTIFICATE_DRIFT', recordId: record.id });
    }
    const reproducibilityDrift = [];
    if (record.reproducibility?.command !== `npm run atlas:experiment -- --record ${record.id}`) {
      reproducibilityDrift.push('command');
    }
    if (record.reproducibility?.seed !== record.provenance.seed) {
      reproducibilityDrift.push('seed');
    }
    if (record.reproducibility?.algorithmVersion !== record.solver.environment.algorithmVersion) {
      reproducibilityDrift.push('algorithmVersion');
    }
    if (record.reproducibility?.deterministic !== record.solver.budget.deterministic ||
      record.reproducibility?.deterministic !== true) {
      reproducibilityDrift.push('deterministic');
    }
    if (reproducibilityDrift.length > 0) {
      findings.push({
        severity: 'critical',
        code: 'REPRODUCIBILITY_DRIFT',
        recordId: record.id,
        fields: reproducibilityDrift
      });
    }
    const proven = record.evidence.state === 'proven_optimal';
    const boundMatched = record.bounds.optimalityGap <= 1e-10;
    if (proven !== boundMatched) {
      findings.push({
        severity: 'major',
        code: 'EVIDENCE_BOUND_MISMATCH',
        recordId: record.id,
        proven,
        boundMatched
      });
    }
  }

  if (options.transitions !== undefined) {
    const expectedTransitions = detectPhaseTransitions(records);
    if (JSON.stringify(options.transitions) !== JSON.stringify(expectedTransitions)) {
      findings.push({
        severity: 'critical',
        code: 'TRANSITION_INDEX_DRIFT',
        expectedCount: expectedTransitions.length,
        actualCount: Array.isArray(options.transitions) ? options.transitions.length : null
      });
    }
  }
  if (options.workQueue !== undefined) {
    const expectedQueue = buildWorkQueue(records);
    if (JSON.stringify(options.workQueue) !== JSON.stringify(expectedQueue)) {
      findings.push({
        severity: 'critical',
        code: 'WORK_QUEUE_DRIFT',
        expectedCount: expectedQueue.length,
        actualCount: Array.isArray(options.workQueue) ? options.workQueue.length : null
      });
    }
  }

  const slices = Map.groupBy(records.filter(record => record.family !== 'scalene'), key);
  for (const [slice, values] of slices) {
    const ordered = [...values].sort((a, b) => a.parameters.rectangleRatio - b.parameters.rectangleRatio);
    for (let index = 1; index < ordered.length; index += 1) {
      const delta = Math.abs(
        ordered[index].verification.utilization -
        ordered[index - 1].verification.utilization
      );
      if (delta >= discontinuityThreshold) {
        findings.push({
          severity: 'review',
          code: 'UTILIZATION_DISCONTINUITY',
          slice,
          records: [ordered[index - 1].id, ordered[index].id],
          delta
        });
      }
    }
  }

  const patternGroups = Map.groupBy(records, record => record.pattern);
  const familyGroups = Map.groupBy(records, record => record.family);
  const summary = {
    records: records.length,
    replayed,
    uniqueExperiments: registry.uniqueExperiments,
    critical: findings.filter(finding => finding.severity === 'critical').length,
    major: findings.filter(finding => finding.severity === 'major').length,
    review: findings.filter(finding => finding.severity === 'review').length,
    meanUtilization: records.reduce((sum, record) => sum + record.verification.utilization, 0) / records.length,
    meanOptimalityGap: records.reduce((sum, record) => sum + record.bounds.optimalityGap, 0) / records.length,
    minimumUtilization: Math.min(...records.map(record => record.verification.utilization)),
    maximumUtilization: Math.max(...records.map(record => record.verification.utilization)),
    byFamily: Object.fromEntries([...familyGroups].map(([family, values]) => [family, {
      records: values.length,
      meanUtilization: values.reduce((sum, record) => sum + record.verification.utilization, 0) / values.length,
      provenOptimal: values.filter(record => record.evidence.state === 'proven_optimal').length
    }])),
    byPattern: Object.fromEntries([...patternGroups].map(([pattern, values]) => [pattern, values.length]))
  };

  return {
    format: 'triangle-packing-atlas-audit/v1',
    releaseVersion: '2.0.0',
    policy: {
      discontinuityThreshold,
      criticalFindingsBlockRelease: true,
      reviewFindingsRequireInspectionButDoNotInvalidateCoordinates: true
    },
    passed: registry.valid && summary.critical === 0 && summary.major === 0 && replayed === records.length,
    summary,
    findings
  };
}

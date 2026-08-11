import { verifyPacking } from '../atlas/verifier.js';
import { experimentId, validateCanonicalRecords, verificationCertificate } from './registry.js';

function key(record) {
  return `${record.family}:${record.parameters.apexAngle}`;
}

export function auditRecords(records, options = {}) {
  const discontinuityThreshold = options.discontinuityThreshold ?? 0.12;
  const registry = validateCanonicalRecords(records);
  const findings = [];
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
    const replay = verifyPacking(record.problem, record.solution.placements);
    replayed += Number(replay.valid);
    if (!replay.valid) findings.push({ severity: 'critical', code: 'INVALID_GEOMETRY', recordId: record.id });
    if (replay.fingerprint !== record.verification.fingerprint) {
      findings.push({ severity: 'critical', code: 'FINGERPRINT_DRIFT', recordId: record.id });
    }
    if (Math.abs(replay.metrics.utilization - record.verification.utilization) > 1e-10) {
      findings.push({ severity: 'critical', code: 'METRIC_DRIFT', recordId: record.id });
    }
    if (record.verification.certificate !== verificationCertificate(
      record.id,
      record.verification.fingerprint,
      record.verification.utilization
    )) {
      findings.push({ severity: 'critical', code: 'CERTIFICATE_DRIFT', recordId: record.id });
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
    if (record.bounds.lowerBound > record.bounds.upperBound + 1e-10) {
      findings.push({ severity: 'critical', code: 'INVERTED_BOUNDS', recordId: record.id });
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

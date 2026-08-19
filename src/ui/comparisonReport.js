import { compareCanonicalRecords } from './comparisonModel.js';

export const COMPARISON_REPORT_FORMAT = 'triangle-packing-atlas-comparison-report/v1';

function reportRecord(record) {
  return {
    id: record.id,
    experimentId: record.experimentId,
    family: record.family,
    pattern: record.pattern,
    parameters: record.parameters,
    evidence: record.evidence,
    bounds: record.bounds,
    verification: {
      utilization: record.verification.utilization,
      pieceCount: record.verification.pieceCount,
      verifier: record.verification.verifier,
      certificate: record.verification.certificate,
      fingerprint: record.verification.fingerprint,
      stability: record.verification.stability
    },
    reproducibility: record.reproducibility
  };
}

export function createComparisonReport(left, right, release, integrity, source) {
  if (!release || !integrity?.digest || !source) throw new Error('verified_comparison_unavailable');
  const comparison = compareCanonicalRecords(left, right);
  return {
    format: COMPARISON_REPORT_FORMAT,
    generatedAt: new Date().toISOString(),
    release: { version: release.version, releasedAt: release.releasedAt, source, integrity: { ...integrity } },
    records: { a: reportRecord(left), b: reportRecord(right) },
    differences: {
      utilization: comparison.utilizationDelta,
      optimalityGap: comparison.gapDelta,
      higherVerifiedFill: comparison.higherFill,
      smallerKnownGap: comparison.smallerGap
    },
    cautions: [
      'Verified fill is normalized by each rectangle area; a higher value does not prove global optimality.',
      'Piece counts are contextual and are not compared when triangle shapes or containers differ.',
      'Best-known and proven-optimal evidence states are not interchangeable; inspect each attached claim and bound.'
    ]
  };
}

export function comparisonReportSummary(report) {
  const a = report.records.a;
  const b = report.records.b;
  const lead = report.differences.higherVerifiedFill === 'tie'
    ? 'Both records have the same verified fill.'
    : `Record ${report.differences.higherVerifiedFill === 'left' ? 'A' : 'B'} has the higher verified fill.`;
  return `${a.id} (${a.evidence.state.replaceAll('_', ' ')}) vs ${b.id} (${b.evidence.state.replaceAll('_', ' ')}). ${lead} This comparison does not by itself prove global optimality.`;
}

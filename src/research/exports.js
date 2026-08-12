const CSV_HEADER = [
  'id',
  'experiment_id',
  'family',
  'apex_angle',
  'rectangle_ratio',
  'pattern',
  'evidence',
  'pieces',
  'utilization',
  'upper_bound',
  'gap',
  'fingerprint'
];

export function buildCanonicalCsv(records) {
  const rows = records.map(record => [
    record.id,
    record.experimentId,
    record.family,
    record.parameters.apexAngle,
    record.parameters.rectangleRatio,
    record.pattern,
    record.evidence.state,
    record.verification.pieceCount,
    record.verification.utilization,
    record.bounds.upperBound,
    record.bounds.optimalityGap,
    record.verification.fingerprint
  ].map(value => `"${String(value).replaceAll('"', '""')}"`).join(','));
  return `${CSV_HEADER.join(',')}\n${rows.join('\n')}\n`;
}

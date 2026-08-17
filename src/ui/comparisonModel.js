function assertComparable(record) {
  const utilization = record?.verification?.utilization;
  const gap = record?.bounds?.optimalityGap;
  const pieces = record?.verification?.pieceCount;
  if (!record?.id || !record?.experimentId || !Number.isFinite(utilization) || !Number.isFinite(gap) || !Number.isInteger(pieces)) {
    throw new TypeError('Comparison records must be canonical verified release records.');
  }
}

export function comparisonOptionLabel(record) {
  assertComparable(record);
  const shape = record.family === 'scalene'
    ? record.experimentId.split('/rectangle-')[0]
    : `${record.parameters.apexAngle}°`;
  return `${record.family} · ${shape} · ${record.parameters.rectangleRatio}:1 · ${(record.verification.utilization * 100).toFixed(1)}%`;
}

export function compareCanonicalRecords(left, right) {
  assertComparable(left);
  assertComparable(right);
  const utilizationDelta = right.verification.utilization - left.verification.utilization;
  const gapDelta = right.bounds.optimalityGap - left.bounds.optimalityGap;
  const pieceDelta = right.verification.pieceCount - left.verification.pieceCount;
  return {
    left,
    right,
    utilizationDelta,
    gapDelta,
    pieceDelta,
    higherFill: utilizationDelta === 0 ? 'tie' : utilizationDelta > 0 ? 'right' : 'left',
    smallerGap: gapDelta === 0 ? 'tie' : gapDelta < 0 ? 'right' : 'left'
  };
}

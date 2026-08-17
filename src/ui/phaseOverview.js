const OVERVIEW_ANGLES = new Set([110, 100, 90, 80, 75, 60, 50, 35]);
const OVERVIEW_RATIOS = new Set([0.75, 1.05, 1.5, 1.95, 2.4, 3]);

export function phaseMapRecords(records, view = 'overview') {
  const ordered = records
    .filter(record => record.family !== 'scalene')
    .toSorted((left, right) =>
      right.parameters.apexAngle - left.parameters.apexAngle ||
      left.parameters.rectangleRatio - right.parameters.rectangleRatio);
  if (view === 'all') return ordered;
  return ordered.filter(record =>
    OVERVIEW_ANGLES.has(record.parameters.apexAngle) &&
    OVERVIEW_RATIOS.has(record.parameters.rectangleRatio));
}

export function phaseMapDimensions(records) {
  return {
    rows: new Set(records.map(record => record.parameters.apexAngle)).size,
    columns: new Set(records.map(record => record.parameters.rectangleRatio)).size
  };
}

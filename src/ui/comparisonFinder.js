function searchableValue(record) {
  const parameters = record.parameters ?? {};
  const shape = parameters.apexAngle ?? parameters.angles ?? parameters.sides ?? '';
  return [
    record.id,
    record.experimentId,
    record.family,
    record.pattern,
    record.evidence?.state,
    shape,
    parameters.rectangleRatio
  ].flat().join(' ').toLowerCase();
}

export function filterComparisonCandidates(records, query) {
  const tokens = String(query ?? '').trim().toLowerCase().split(/\s+/).filter(Boolean);
  if (!tokens.length) return records;
  return records.filter(record => {
    const value = searchableValue(record);
    return tokens.every(token => value.includes(token));
  });
}

export function comparisonMatchMessage({ matches, total, retained }) {
  if (matches === total) return `${total} verified records available.`;
  if (matches === 0 && retained) return 'No other verified records match. The current result is retained.';
  return `${matches} of ${total} verified records match.`;
}

function ratio(record) {
  return Number(record.parameters?.rectangleRatio);
}

function shapeSignature(record) {
  const parameters = record.parameters ?? {};
  return JSON.stringify([record.family, parameters.apexAngle ?? parameters.angles ?? parameters.sides ?? null]);
}

function nearest(records, score) {
  return [...records].sort((left, right) => score(left) - score(right) || left.id.localeCompare(right.id))[0] ?? null;
}

export function buildComparisonGuides(records, anchorId) {
  const anchor = records.find(record => record.id === anchorId) ?? records[0];
  if (!anchor) return [];
  const proven = nearest(records.filter(record => record.evidence?.state === 'proven_optimal'), record => Math.abs(ratio(record) - 1.5));
  const open = nearest(records.filter(record => record.evidence?.state !== 'proven_optimal'), record => -Number(record.bounds?.optimalityGap ?? 0));
  const sameShape = nearest(records.filter(record => record.id !== anchor.id && shapeSignature(record) === shapeSignature(anchor)), record => -Math.abs(ratio(record) - ratio(anchor)));
  const differentShape = nearest(records.filter(record => record.family !== anchor.family), record => Math.abs(ratio(record) - ratio(anchor)));
  return [
    proven && open && {
      id: 'exact-vs-open',
      title: 'Exact result vs open case',
      description: 'See how proven and best-known evidence differ.',
      left: proven.id,
      right: open.id
    },
    sameShape && {
      id: 'change-container',
      title: 'Change the container',
      description: 'Keep the triangle shape and compare a different rectangle ratio.',
      left: anchor.id,
      right: sameShape.id
    },
    differentShape && {
      id: 'change-triangle',
      title: 'Change the triangle',
      description: 'Keep a similar rectangle ratio and compare another triangle family.',
      left: anchor.id,
      right: differentShape.id
    }
  ].filter(Boolean);
}

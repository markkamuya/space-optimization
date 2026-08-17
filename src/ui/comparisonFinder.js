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

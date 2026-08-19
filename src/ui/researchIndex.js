function normalizedRecord(record) {
  const parameters = record.parameters ?? {};
  return [record.id, record.experimentId, record.family, record.pattern, record.evidence?.state,
    parameters.apexAngle, parameters.angles, parameters.sides, parameters.rectangleRatio]
    .flat().filter(value => value != null).join(' ').toLowerCase();
}

function trigrams(value) {
  const result = new Set();
  for (let index = 0; index <= value.length - 3; index += 1) result.add(value.slice(index, index + 3));
  return result;
}

function intersect(left, right) {
  if (!left) return new Set(right);
  const result = new Set();
  const [smaller, larger] = left.size <= right.size ? [left, right] : [right, left];
  for (const value of smaller) if (larger.has(value)) result.add(value);
  return result;
}

export function buildResearchIndex(records) {
  const searchValues = [];
  const families = new Map();
  const evidence = new Map();
  const grams = new Map();
  records.forEach((record, index) => {
    const value = normalizedRecord(record);
    searchValues.push(value);
    if (!families.has(record.family)) families.set(record.family, new Set());
    families.get(record.family).add(index);
    if (!evidence.has(record.evidence.state)) evidence.set(record.evidence.state, new Set());
    evidence.get(record.evidence.state).add(index);
    for (const gram of trigrams(value)) {
      if (!grams.has(gram)) grams.set(gram, new Set());
      grams.get(gram).add(index);
    }
  });
  return Object.freeze({ records, searchValues, families, evidence, grams });
}

export function filterResearchIndex(index, { query = '', family = 'all', evidence = 'all' } = {}) {
  const tokens = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  let candidates = null;
  if (family !== 'all') candidates = intersect(candidates, index.families.get(family) ?? new Set());
  if (evidence !== 'all') candidates = intersect(candidates, index.evidence.get(evidence) ?? new Set());
  for (const token of tokens) {
    if (token.length < 3) continue;
    for (const gram of trigrams(token)) candidates = intersect(candidates, index.grams.get(gram) ?? new Set());
  }
  const source = candidates ? [...candidates].sort((left, right) => left - right) : index.records.map((_, recordIndex) => recordIndex);
  return source
    .filter(recordIndex => tokens.every(token => index.searchValues[recordIndex].includes(token)))
    .map(recordIndex => index.records[recordIndex]);
}

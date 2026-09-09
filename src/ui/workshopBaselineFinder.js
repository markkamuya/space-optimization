export const WORKSHOP_BASELINE_LIMIT = 40;

function searchable(record) {
  return [record.id, record.experimentId, record.family, record.pattern, record.evidence?.state,
    record.parameters?.apexAngle, record.parameters?.angles, record.parameters?.sides,
    record.parameters?.rectangleRatio].flat().filter(value => value != null).join(' ').toLowerCase();
}

export function findWorkshopBaselines(records, { query = '', currentId = null, limit = WORKSHOP_BASELINE_LIMIT } = {}) {
  const safeLimit = Math.max(1, Math.min(WORKSHOP_BASELINE_LIMIT, Number.isInteger(limit) ? limit : WORKSHOP_BASELINE_LIMIT));
  const tokens = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  const matches = records.filter(record => tokens.every(token => searchable(record).includes(token)));
  const current = records.find(record => record.id === currentId) ?? null;
  const ordered = current ? [current, ...matches.filter(record => record.id !== current.id)] : matches;
  return { records: ordered.slice(0, safeLimit), matchCount: matches.length, currentIncludedOutsideQuery: Boolean(current && !matches.some(record => record.id === current.id)), truncated: ordered.length > safeLimit };
}

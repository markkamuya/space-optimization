const DEFAULT_STATE = Object.freeze({ query: '', family: 'all', evidence: 'all', record: null });
const FAMILIES = new Set(['all', 'right', 'equilateral', 'isosceles', 'scalene']);
const EVIDENCE = new Set(['all', 'proven_optimal', 'verified_best_known']);

export function parseResearchHash(hash) {
  if (!hash.startsWith('#research')) return { ...DEFAULT_STATE };
  const queryString = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const params = new URLSearchParams(queryString);
  const family = params.get('family') ?? 'all';
  const evidence = params.get('evidence') ?? 'all';
  return {
    query: (params.get('q') ?? '').slice(0, 200),
    family: FAMILIES.has(family) ? family : 'all',
    evidence: EVIDENCE.has(evidence) ? evidence : 'all',
    record: params.get('record') || null
  };
}

export function formatResearchHash(state) {
  const params = new URLSearchParams();
  const query = String(state.query ?? '').trim().slice(0, 200);
  if (query) params.set('q', query);
  if (FAMILIES.has(state.family) && state.family !== 'all') params.set('family', state.family);
  if (EVIDENCE.has(state.evidence) && state.evidence !== 'all') params.set('evidence', state.evidence);
  if (state.record) params.set('record', String(state.record));
  const suffix = params.toString();
  return `#research${suffix ? `?${suffix}` : ''}`;
}

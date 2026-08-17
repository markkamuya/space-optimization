const MAX_RECORD_ID_LENGTH = 160;

function safeRecordId(value) {
  const id = String(value ?? '').trim();
  return id && id.length <= MAX_RECORD_ID_LENGTH ? id : null;
}

export function parseComparisonHash(hash) {
  if (!hash.startsWith('#compare')) return { left: null, right: null };
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  return { left: safeRecordId(params.get('a')), right: safeRecordId(params.get('b')) };
}

export function formatComparisonHash({ left, right }) {
  const params = new URLSearchParams();
  const safeLeft = safeRecordId(left);
  const safeRight = safeRecordId(right);
  if (safeLeft) params.set('a', safeLeft);
  if (safeRight) params.set('b', safeRight);
  const suffix = params.toString();
  return `#compare${suffix ? `?${suffix}` : ''}`;
}

export function resolveComparisonState(state, availableIds, defaults) {
  const ids = availableIds instanceof Set ? availableIds : new Set(availableIds);
  return {
    left: ids.has(state.left) ? state.left : defaults.left,
    right: ids.has(state.right) ? state.right : defaults.right
  };
}

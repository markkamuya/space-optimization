const DEFAULT_STATE = Object.freeze({ angle: 60, ratio: 1.5, record: null });

function boundedNumber(value, { minimum, maximum, step }) {
  if (value == null || value === '') return null;
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) return null;
  const bounded = Math.min(maximum, Math.max(minimum, parsed));
  const snapped = Math.round((bounded - minimum) / step) * step + minimum;
  return Number(snapped.toFixed(4));
}

export function parseMapHash(hash) {
  if (!hash.startsWith('#map')) return { ...DEFAULT_STATE };
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const params = new URLSearchParams(query);
  return {
    angle: boundedNumber(params.get('angle'), { minimum: 35, maximum: 110, step: 1 }) ?? DEFAULT_STATE.angle,
    ratio: boundedNumber(params.get('ratio'), { minimum: 0.75, maximum: 3, step: 0.05 }) ?? DEFAULT_STATE.ratio,
    record: params.get('record') || null
  };
}

export function formatMapHash(state) {
  const angle = boundedNumber(state.angle, { minimum: 35, maximum: 110, step: 1 }) ?? DEFAULT_STATE.angle;
  const ratio = boundedNumber(state.ratio, { minimum: 0.75, maximum: 3, step: 0.05 }) ?? DEFAULT_STATE.ratio;
  const params = new URLSearchParams();
  if (angle !== DEFAULT_STATE.angle) params.set('angle', String(angle));
  if (ratio !== DEFAULT_STATE.ratio) params.set('ratio', String(ratio));
  if (state.record) params.set('record', String(state.record));
  const suffix = params.toString();
  return `#map${suffix ? `?${suffix}` : ''}`;
}

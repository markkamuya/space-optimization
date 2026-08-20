export const RELEASE_FRESHNESS_WINDOW_MS = 30 * 60 * 1000;

export function releaseFreshness(verifiedAtEpoch, nowEpoch = Date.now(), online = true) {
  if (!Number.isFinite(verifiedAtEpoch)) return { state: 'unknown', ageMs: null, recheckDue: false };
  const ageMs = Math.max(0, nowEpoch - verifiedAtEpoch);
  if (!online) return { state: 'offline', ageMs, recheckDue: false };
  return { state: ageMs >= RELEASE_FRESHNESS_WINDOW_MS ? 'recheck_due' : 'fresh', ageMs, recheckDue: ageMs >= RELEASE_FRESHNESS_WINDOW_MS };
}

export function freshnessDelay(verifiedAtEpoch, nowEpoch = Date.now()) {
  if (!Number.isFinite(verifiedAtEpoch)) return null;
  return Math.max(0, RELEASE_FRESHNESS_WINDOW_MS - Math.max(0, nowEpoch - verifiedAtEpoch));
}

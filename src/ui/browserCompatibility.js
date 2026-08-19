const CAPABILITIES = Object.freeze([
  ['release integrity checks', environment => Boolean(environment.crypto?.subtle)],
  ['verified data loading', environment => typeof environment.fetch === 'function'],
  ['safe request cancellation', environment => typeof environment.AbortController === 'function'],
  ['accessible result dialogs', environment => typeof environment.HTMLDialogElement?.prototype?.showModal === 'function'],
  ['workspace position tracking', environment => typeof environment.IntersectionObserver === 'function']
]);

export function browserCompatibility(environment = globalThis) {
  const missing = CAPABILITIES.filter(([, supported]) => !supported(environment)).map(([label]) => label);
  return {
    supported: missing.length === 0,
    canVerifyRelease: !missing.includes('release integrity checks') &&
      !missing.includes('verified data loading') &&
      !missing.includes('safe request cancellation'),
    missing,
    message: missing.length
      ? `This browser is missing ${missing.join(', ')}. Verified research data stays unavailable; update the browser or use a current Firefox, Safari, or Chromium release.`
      : 'This browser supports the Atlas verification and interaction requirements.'
  };
}

export function listenForMediaChange(mediaQuery, listener) {
  if (typeof mediaQuery.addEventListener === 'function') {
    mediaQuery.addEventListener('change', listener);
    return 'event-listener';
  }
  mediaQuery.addListener?.(listener);
  return 'legacy-listener';
}

const MESSAGES = Object.freeze({
  loading: {
    headline: 'Checking verified research data…',
    detail: 'The map remains a modeled preview until release integrity checks finish.'
  },
  refreshing: {
    headline: 'Rechecking verified research data…',
    detail: 'The last verified results remain available while a fresh integrity check runs.'
  },
  offline_empty: {
    headline: 'You appear to be offline.',
    detail: 'Verified evidence is unavailable. The map is labeled as a modeled preview until you reconnect.'
  },
  offline_retained: {
    headline: 'Offline · last verified results retained',
    detail: 'Previously integrity-checked results remain available. Reconnect to check for a newer release.'
  },
  failed_empty: {
    headline: 'Verified evidence is temporarily unavailable.',
    detail: 'No research records are shown. The map remains a modeled preview and makes no verified claim.'
  },
  failed_retained: {
    headline: 'Refresh failed · last verified results retained',
    detail: 'The failed attempt did not replace the previously integrity-checked release.'
  },
  verified_shards: {
    headline: 'Verified release ready',
    detail: 'Every displayed research record passed shard integrity checks.'
  },
  verified_fallback: {
    headline: 'Verified fallback release ready',
    detail: 'Every displayed research record passed the canonical checksum after a shard was unavailable.'
  }
});

export function releaseExperience({ phase, hasVerifiedRelease = false, source = null, online = true }) {
  let mode;
  if (!online) mode = hasVerifiedRelease ? 'offline_retained' : 'offline_empty';
  else if (phase === 'loading') mode = hasVerifiedRelease ? 'refreshing' : 'loading';
  else if (phase === 'ready') mode = source === 'verified_monolith_fallback' ? 'verified_fallback' : 'verified_shards';
  else mode = hasVerifiedRelease ? 'failed_retained' : 'failed_empty';
  return {
    mode,
    canUseVerified: hasVerifiedRelease || phase === 'ready',
    preserveVerified: mode === 'refreshing' || mode.endsWith('_retained'),
    canRetry: online && !['loading', 'refreshing'].includes(mode),
    ...MESSAGES[mode]
  };
}

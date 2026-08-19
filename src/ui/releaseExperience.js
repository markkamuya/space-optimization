const MESSAGES = Object.freeze({
  loading: {
    label: 'Checking',
    trust: 'unavailable',
    headline: 'Checking verified research data…',
    detail: 'The map remains a modeled preview until release integrity checks finish.'
  },
  refreshing: {
    label: 'Retained verified',
    trust: 'retained',
    headline: 'Rechecking verified research data…',
    detail: 'The last verified results remain available while a fresh integrity check runs.'
  },
  offline_empty: {
    label: 'Unavailable',
    trust: 'unavailable',
    headline: 'You appear to be offline.',
    detail: 'Verified evidence is unavailable. The map is labeled as a modeled preview until you reconnect.'
  },
  offline_retained: {
    label: 'Retained verified',
    trust: 'retained',
    headline: 'Offline · last verified results retained',
    detail: 'Previously integrity-checked results remain available. Reconnect to check for a newer release.'
  },
  failed_empty: {
    label: 'Unavailable',
    trust: 'unavailable',
    headline: 'Verified evidence is temporarily unavailable.',
    detail: 'No research records are shown. The map remains a modeled preview and makes no verified claim.'
  },
  failed_retained: {
    label: 'Retained verified',
    trust: 'retained',
    headline: 'Refresh failed · last verified results retained',
    detail: 'The failed attempt did not replace the previously integrity-checked release.'
  },
  verified_shards: {
    label: 'Verified',
    trust: 'verified',
    headline: 'Verified release ready',
    detail: 'Every displayed research record passed shard integrity checks.'
  },
  verified_fallback: {
    label: 'Verified fallback',
    trust: 'verified',
    headline: 'Verified fallback release ready',
    detail: 'Every displayed research record passed the canonical checksum after a shard was unavailable.'
  }
});

export function releaseExperience({ phase, hasVerifiedRelease = false, source = null, online = true, verifiedAt = null }) {
  let mode;
  if (!online) mode = hasVerifiedRelease ? 'offline_retained' : 'offline_empty';
  else if (phase === 'loading') mode = hasVerifiedRelease ? 'refreshing' : 'loading';
  else if (phase === 'ready') mode = source === 'verified_monolith_fallback' ? 'verified_fallback' : 'verified_shards';
  else mode = hasVerifiedRelease ? 'failed_retained' : 'failed_empty';
  const message = MESSAGES[mode];
  return {
    mode,
    canUseVerified: hasVerifiedRelease || phase === 'ready',
    preserveVerified: mode === 'refreshing' || mode.endsWith('_retained'),
    canRetry: online && !['loading', 'refreshing'].includes(mode),
    provenance: message.trust === 'verified' && verifiedAt
      ? `Integrity checked this session at ${verifiedAt}`
      : message.trust === 'retained' && verifiedAt
        ? `Last integrity check this session: ${verifiedAt}`
        : 'No verified release is currently displayed',
    ...message
  };
}

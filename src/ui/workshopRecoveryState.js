export function workshopRecoveryState({ baselineReady = false, available = false, dirty = false } = {}) {
  if (!baselineReady) return {
    available: false,
    label: 'Recover saved work',
    status: 'Recovery is waiting for a verified baseline.'
  };
  if (!available) return {
    available: false,
    label: 'No recovery copy',
    status: dirty
      ? 'No checksummed recovery copy is available yet. Save or export this local draft.'
      : 'No checksummed recovery copy exists for this verified baseline.'
  };
  return {
    available: true,
    label: 'Recover saved work',
    status: dirty
      ? 'A checksummed recovery copy is available. Recovering it will replace the current local edits.'
      : 'A checksummed recovery copy is available for this verified baseline.'
  };
}

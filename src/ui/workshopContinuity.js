export function workshopContinuityState({ baselineReady = false, dirty = false, validation = null, preservation = 'none' } = {}) {
  if (!baselineReady) return {
    state: 'blocked',
    action: 'none',
    label: 'Waiting for verified baseline',
    status: 'A verified baseline must load before the Workshop can suggest a next step.'
  };
  if (!dirty) return {
    state: 'adjust',
    action: 'exact',
    label: 'Adjust exact coordinates',
    status: 'The verified baseline is unchanged. Adjust one triangle to create a local draft.'
  };
  if (!validation) return {
    state: 'check',
    action: 'validate',
    label: 'Validate this draft',
    status: 'Coordinates changed locally. Check geometry before preserving or reviewing the draft.'
  };
  if (!validation.geometryValid) return {
    state: 'repair',
    action: 'findings',
    label: 'Review validation findings',
    status: 'Local checks found geometry problems. Review the findings and repair the draft.'
  };
  if (preservation === 'none') return {
    state: 'preserve',
    action: 'save',
    label: 'Save local draft',
    status: 'Local geometry checks passed. Save or export this still-unverified draft before review.'
  };
  return {
    state: 'review',
    action: 'review',
    label: 'Review contribution plan',
    status: 'The local draft is preserved. Review what remains before any GitHub contribution.'
  };
}

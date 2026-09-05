export const WORKSHOP_JOURNEY_STEPS = [
  { id: 'workshop-baseline-title', name: 'Start' },
  { id: 'workshop-editor-title', name: 'Adjust' },
  { id: 'workshop-validation-title', name: 'Check' },
  { id: 'workshop-handoff-title', name: 'Preserve' }
];

export function workshopJourneyState({ baselineReady = false, validation = null, preservation = 'none', recoveryAvailable = false, challengeReady = false } = {}) {
  const geometryValid = validation?.geometryValid === true;
  const eligible = validation?.eligibleForContribution === true;
  const preserved = ['saved', 'exported', 'review-packet'].includes(preservation);
  if (!baselineReady) return {
    summary: 'Step 1 of 4 · Waiting for an integrity-checked baseline. Editing and conclusions remain locked.',
    stages: [
      { state: 'current', detail: 'Waiting for verified data' },
      { state: 'blocked', detail: 'Needs a verified baseline' },
      { state: 'blocked', detail: 'Needs a candidate' },
      { state: 'blocked', detail: 'Needs local validation' }
    ]
  };
  if (!validation) return {
    summary: 'Step 2 of 4 · Adjust a triangle or validate the unchanged baseline. No improvement is claimed.',
    stages: [
      { state: 'complete', detail: 'Verified baseline ready' },
      { state: 'current', detail: 'Adjust or keep baseline' },
      { state: 'available', detail: 'Run local validation' },
      { state: 'blocked', detail: recoveryAvailable ? 'Recovery copy available' : 'Needs local validation' }
    ]
  };
  if (!geometryValid) return {
    summary: 'Step 2 of 4 · Fix the reported geometry, then run local validation again.',
    stages: [
      { state: 'complete', detail: 'Verified baseline ready' },
      { state: 'needs-attention', detail: 'Fix reported geometry' },
      { state: 'needs-attention', detail: 'Validation did not pass' },
      { state: 'blocked', detail: 'Invalid geometry is withheld' }
    ]
  };
  const preserveDetail = preserved
    ? preservation === 'saved' ? 'Draft saved in browser' : preservation === 'review-packet' ? 'Review packet prepared' : 'Reproducible file exported'
    : eligible && challengeReady ? 'Prepare challenge review' : recoveryAvailable ? 'Recovery copy available' : 'Save this local experiment';
  return {
    summary: preserved
      ? `Step 4 of 4 · ${preserveDetail}. Independent verification and review are still required.`
      : eligible && challengeReady
        ? 'Step 4 of 4 · Preserve the eligible candidate and prepare a bounded challenge review. This is not proof or publication.'
        : 'Step 4 of 4 · Preserve this locally valid experiment. It does not improve the incumbent.',
    stages: [
      { state: 'complete', detail: 'Verified baseline ready' },
      { state: 'complete', detail: 'Candidate prepared' },
      { state: 'complete', detail: eligible ? 'Eligible local candidate' : 'Valid; no improvement' },
      { state: preserved ? 'complete' : 'current', detail: preserveDetail }
    ]
  };
}

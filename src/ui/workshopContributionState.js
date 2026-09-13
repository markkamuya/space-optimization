const PRESERVED = new Set(['saved', 'exported', 'review-packet']);

export function workshopContributionState({ validation = null, challenge = null, preservation = 'none' } = {}) {
  const eligible = validation?.eligibleForContribution === true;
  const challengeReady = eligible && Boolean(challenge?.challengeId && challenge?.issueUrl);
  const preserved = PRESERVED.has(preservation);
  if (!eligible) return {
    state: 'locked',
    status: 'The handoff stays locked until local geometry, provenance, and incumbent checks support an improvement candidate.',
    actions: { exportCandidate: false, exportReview: false, copySummary: false, copyWorkflow: false, openGitHub: false },
    githubHref: null,
    stages: [
      { state: validation ? 'blocked' : 'current', label: validation ? 'Local checks need attention' : 'Run local improvement checks' },
      { state: 'blocked', label: 'Prepare review files' },
      { state: 'blocked', label: 'Open external review' }
    ]
  };
  if (!challengeReady) return {
    state: 'unbound',
    status: 'Local checks support a candidate, but no exact open challenge is bound to this baseline. Export review files and request maintainer guidance.',
    actions: { exportCandidate: true, exportReview: true, copySummary: false, copyWorkflow: false, openGitHub: false },
    githubHref: null,
    stages: [
      { state: 'complete', label: 'Local improvement checks passed' },
      { state: preserved ? 'complete' : 'current', label: preserved ? 'Review files preserved' : 'Prepare review files' },
      { state: 'blocked', label: 'Needs an exact open challenge' }
    ]
  };
  return {
    state: 'ready',
    status: `Plan ready for ${challenge.challengeId}. Copying it does not create a branch, upload files, or open a pull request.`,
    actions: { exportCandidate: true, exportReview: true, copySummary: true, copyWorkflow: true, openGitHub: true },
    githubHref: challenge.issueUrl,
    stages: [
      { state: 'complete', label: 'Local improvement checks passed' },
      { state: preserved ? 'complete' : 'current', label: preserved ? 'Review files preserved' : 'Prepare review files' },
      { state: preserved ? 'available' : 'blocked', label: preserved ? `Challenge ${challenge.challengeId} is ready for review` : 'Preserve files before external review' }
    ]
  };
}

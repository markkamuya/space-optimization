const STAGES = Object.freeze({
  map: ['Explore', 'Choose a triangle and rectangle, then inspect the nearest verified sample.'],
  research: ['Verify', 'Read the evidence, bounds, coordinates, and reproduction trail for a verified result.'],
  compare: ['Compare', 'Compare verified results without treating different packing problems as equivalent.'],
  challenges: ['Improve', 'Start from a reproducible verified baseline and preserve the published evidence claim.'],
  contribute: ['Contribute', 'Check a candidate locally before asking reviewers to consider a new result.']
});

function sectionFromHash(hash = '') {
  const section = hash.replace(/^#/, '').split('?')[0];
  return Object.hasOwn(STAGES, section) ? section : 'map';
}

function evidenceDescription(record) {
  if (!record) return 'No verified sample selected yet';
  return record.evidence?.state === 'proven_optimal'
    ? 'Proven optimal for this exact problem'
    : 'Verified best known; improvement may still be possible';
}

export function advancedOrientation({ hash = '#map', angle = 60, ratio = 1.5, record = null, releaseReady = false } = {}) {
  const section = sectionFromHash(hash);
  const [stage, guidance] = STAGES[section];
  return {
    section, stage, guidance,
    problem: `${Number(angle).toFixed(0)}° triangle in a ${Number(ratio).toFixed(2)}:1 rectangle`,
    sample: record?.problem?.name ?? 'Nearest verified sample pending',
    evidence: releaseReady ? evidenceDescription(record) : 'Waiting for integrity-checked release',
    recordId: record?.id ?? null
  };
}

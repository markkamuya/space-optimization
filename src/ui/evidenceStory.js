export const EVIDENCE_LADDER = Object.freeze([
  { id: 'candidate', label: 'Candidate', description: 'A proposed construction that still needs independent checking.' },
  { id: 'verified_construction', label: 'Verified construction', description: 'The coordinates fit without forbidden overlap under the published geometry rules.' },
  { id: 'verified_best_known', label: 'Best known', description: 'The strongest independently verified construction in this Atlas release for the exact problem.' },
  { id: 'proven_optimal', label: 'Proven optimal', description: 'The verified construction reaches a rigorous upper bound for the exact problem.' }
]);

const LEVEL = Object.freeze({ candidate: 0, verified_construction: 1, verified_best_known: 2, proven_optimal: 3 });

export function evidenceLevel(state = 'candidate') {
  return LEVEL[state] ?? 0;
}

export function evidenceLadder(state = 'candidate') {
  const current = evidenceLevel(state);
  return EVIDENCE_LADDER.map((step, index) => ({
    ...step,
    reached: index <= current,
    current: index === current
  }));
}

export function recordConclusion(record) {
  if (!record?.evidence || !record?.verification || !record?.bounds) return null;
  const proven = record.evidence.state === 'proven_optimal';
  return {
    state: record.evidence.state,
    label: EVIDENCE_LADDER[evidenceLevel(record.evidence.state)].label,
    whatIsProven: proven
      ? 'These verified coordinates reach the rigorous upper bound, so no better packing exists for this exact triangle and rectangle.'
      : 'These published coordinates fit under the Atlas geometry rules and establish the displayed lower bound.',
    whatIsUnknown: proven
      ? 'This proof applies only to the exact problem identity and permissions shown here; it does not generalize to nearby shapes or containers.'
      : `A better construction may exist. The rigorous bounds leave ${(record.bounds.optimalityGap * 100).toFixed(1)}% room for improvement.`,
    whyTrusted: `Independent verifier ${record.verification.verifier} accepted ${record.verification.pieceCount} pieces; certificate ${record.verification.certificate}.`
  };
}

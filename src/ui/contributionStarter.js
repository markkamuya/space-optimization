export function createContributionStarter(baseline, release, integrity, source) {
  if (!baseline || !release || !integrity?.digest || !source) throw new Error('verified_baseline_unavailable');
  return {
    format: 'triangle-packing-atlas/v1',
    id: `${baseline.id}-candidate`,
    problem: structuredClone(baseline.problem),
    solution: {
      construction: `improve-${baseline.id}`,
      placements: structuredClone(baseline.solution.placements)
    },
    evidence: {
      status: 'candidate',
      notes: `Starter copied from verified baseline ${baseline.id}. Replace with an independently verified improvement before submission.`
    },
    provenance: {
      generator: 'replace-with-your-method',
      version: 'replace-with-your-version',
      seed: baseline.reproducibility?.seed ?? baseline.provenance?.seed ?? 'replace-with-your-seed',
      runtimeMs: 0,
      contributor: 'replace-with-your-name',
      license: 'CC-BY-4.0',
      createdAt: new Date().toISOString()
    }
  };
}

export function contributionHandoff(baseline) {
  const filename = `${baseline.id}-candidate.json`;
  return {
    filename,
    verifyCommand: `npm run atlas:submission -- ${filename}`,
    steps: [
      'Replace the starter placements with your improved coordinates and update method provenance.',
      'Run the full submission verifier; browser preflight alone is not scientific verification.',
      'Confirm the report says improves_record and review every geometry or incumbent-comparison finding.',
      'Open a GitHub contribution with the candidate and verifier output for maintainer review.'
    ]
  };
}

import { createHash } from 'node:crypto';

export const CANONICAL_FORMAT = 'triangle-packing-atlas/v2';
export const VERIFIER_VERSION = 'geometry-verifier/2.0.0';

export function experimentId(record) {
  const shape = record.family === 'scalene'
    ? record.id.split('-r')[0]
    : `apex-${record.parameters.apexAngle}`;
  return `${record.family}/${shape}/rectangle-${record.parameters.rectangleRatio}`;
}

export function evidenceState(record) {
  if (record.status === 'proven_optimal') return 'proven_optimal';
  if (record.bounds?.optimalityGap === 0) return 'bound_matched';
  return 'verified_best_known';
}

export function canonicalRecord(record) {
  const verification = {
    ...record.verification,
    verifier: VERIFIER_VERSION,
    tolerancePolicy: 'docs/NUMERICAL_POLICY.md',
    certificate: `sha256:${createHash('sha256')
      .update(`${record.id}:${record.verification.fingerprint}:${record.verification.utilization}`)
      .digest('hex')}`
  };
  return {
    ...record,
    experimentId: experimentId(record),
    evidence: {
      state: evidenceState(record),
      claim: evidenceState(record) === 'proven_optimal'
        ? 'Globally optimal for the declared normalized problem.'
        : 'Best independently verified construction in this release; global optimality is not claimed.',
      reviewed: evidenceState(record) === 'proven_optimal',
      citations: []
    },
    verification,
    history: [{
      version: '2.0.0',
      event: 'canonical_import',
      utilization: record.verification.utilization,
      fingerprint: record.verification.fingerprint,
      contributor: record.provenance.contributor,
      timestamp: record.provenance.createdAt
    }],
    reproducibility: {
      command: `npm run atlas:experiment -- --record ${record.id}`,
      deterministic: record.solver.budget.deterministic,
      seed: record.provenance.seed,
      algorithmVersion: record.solver.environment.algorithmVersion
    }
  };
}

export function validateCanonicalRecords(records) {
  const errors = [];
  const ids = new Set();
  const experiments = new Map();
  for (const record of records) {
    if (ids.has(record.id)) errors.push({ code: 'DUPLICATE_ID', recordId: record.id });
    ids.add(record.id);
    if (!record.verification?.valid) errors.push({ code: 'UNVERIFIED_RECORD', recordId: record.id });
    if (!record.verification?.certificate) errors.push({ code: 'MISSING_CERTIFICATE', recordId: record.id });
    if (!record.reproducibility?.command) errors.push({ code: 'MISSING_REPRODUCTION', recordId: record.id });
    const incumbent = experiments.get(record.experimentId);
    if (incumbent && incumbent.verification.utilization < record.verification.utilization) {
      errors.push({ code: 'INFERIOR_INCUMBENT', recordId: incumbent.id, challenger: record.id });
    }
    if (!incumbent || incumbent.verification.utilization < record.verification.utilization) {
      experiments.set(record.experimentId, record);
    }
  }
  return { valid: errors.length === 0, errors, uniqueExperiments: experiments.size };
}

export function detectPhaseTransitions(records) {
  const transitions = [];
  const groups = Map.groupBy(
    records.filter(record => record.family !== 'scalene'),
    record => record.parameters.apexAngle
  );
  for (const [angle, slice] of groups) {
    const ordered = [...slice].sort((a, b) => a.parameters.rectangleRatio - b.parameters.rectangleRatio);
    for (let index = 1; index < ordered.length; index += 1) {
      if (ordered[index - 1].pattern !== ordered[index].pattern) {
        transitions.push({
          apexAngle: angle,
          betweenRatios: [ordered[index - 1].parameters.rectangleRatio, ordered[index].parameters.rectangleRatio],
          from: ordered[index - 1].pattern,
          to: ordered[index].pattern,
          evidence: [ordered[index - 1].id, ordered[index].id]
        });
      }
    }
  }
  return transitions;
}

export function compareCandidate(candidate, records) {
  const duplicate = records.find(record => record.verification.fingerprint === candidate.verification?.fingerprint);
  if (duplicate) return { decision: 'duplicate', incumbent: duplicate.id, delta: 0 };
  const incumbent = records
    .filter(record => record.experimentId === candidate.experimentId)
    .sort((a, b) => b.verification.utilization - a.verification.utilization)[0];
  if (!incumbent) return { decision: 'new_experiment', incumbent: null, delta: candidate.verification.utilization };
  const delta = candidate.verification.utilization - incumbent.verification.utilization;
  return { decision: delta > 1e-10 ? 'record_improvement' : 'inferior', incumbent: incumbent.id, delta };
}

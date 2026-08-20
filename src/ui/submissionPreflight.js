import { validateRecordShape } from '../atlas/schema.js';
import { packingProblemIdentity } from '../atlas/problemIdentity.js';

function check(id, label, passed, detail) {
  return { id, label, passed: Boolean(passed), detail };
}

export function preflightContribution(candidate, baseline) {
  const schema = validateRecordShape(candidate);
  let sameProblem = false;
  try { sameProblem = packingProblemIdentity(candidate.problem) === packingProblemIdentity(baseline.problem); } catch { sameProblem = false; }
  const provenance = candidate?.provenance ?? {};
  const placements = candidate?.solution?.placements;
  const checks = [
    check('schema', 'Submission structure', schema.valid, schema.valid ? 'All required record fields use the supported format.' : `${schema.errors.length} structural issue${schema.errors.length === 1 ? '' : 's'} must be fixed.`),
    check('baseline', 'Baseline identity', sameProblem, sameProblem ? `The triangle inventory and container match ${baseline.id}.` : `The proposed problem does not match the selected baseline ${baseline.id}.`),
    check('coordinates', 'Finite coordinates', Array.isArray(placements) && placements.length > 0 && placements.every(p => ['x', 'y', 'angle'].every(key => Number.isFinite(p?.[key]))), 'Every placement needs finite x, y, and angle values.'),
    check('reproducibility', 'Reproducible method', typeof provenance.generator === 'string' && provenance.generator.trim() && typeof provenance.version === 'string' && provenance.version.trim() && ((typeof provenance.seed === 'string' && provenance.seed.trim()) || Number.isFinite(provenance.seed)) && Number.isFinite(provenance.runtimeMs) && provenance.runtimeMs >= 0, 'Include generator, version, deterministic seed, and non-negative runtime.'),
    check('attribution', 'Attribution and license', typeof provenance.contributor === 'string' && provenance.contributor.trim() && provenance.license === 'CC-BY-4.0', 'Contributor attribution and CC-BY-4.0 are required.'),
    check('claim', 'Reviewable evidence claim', ['candidate', 'verified', 'published', 'proven_optimal'].includes(candidate?.evidence?.status), 'Use a supported evidence state. Proof and publication claims always require maintainer review.')
  ];
  return {
    readyForFullVerification: checks.every(item => item.passed),
    checks,
    schemaErrors: schema.errors,
    boundary: 'This browser preflight checks readiness only. It does not verify geometry, prove optimality, upload data, or replace maintainer review.'
  };
}

import { packingFingerprint } from './fingerprint.js';
import { validateRecordShape } from './schema.js';
import { verifyAtlasRecord } from './verifier.js';
import { packingProblemIdentity } from './problemIdentity.js';
import { queryVerifiedIncumbentIndex } from './published.js';
export { packingProblemIdentity } from './problemIdentity.js';

export function assessSubmission(candidate, publishedRecords) {
  const schema = validateRecordShape(candidate);
  const addSchemaError = (path, message) => schema.errors.push({ path, message });
  if (typeof candidate?.provenance?.version !== 'string' || candidate.provenance.version.trim().length === 0) {
    addSchemaError('provenance.version', 'Solver or construction version is required');
  }
  const seed = candidate?.provenance?.seed;
  const validSeed = (typeof seed === 'string' && seed.trim().length > 0 && seed.length <= 256) ||
    (typeof seed === 'number' && Number.isFinite(seed));
  if (!validSeed) addSchemaError('provenance.seed', 'A finite number or non-empty deterministic seed is required');
  if (!Number.isFinite(candidate?.provenance?.runtimeMs) || candidate.provenance.runtimeMs < 0) {
    addSchemaError('provenance.runtimeMs', 'Runtime must be a non-negative finite number');
  }
  if (typeof candidate?.provenance?.contributor !== 'string' ||
    candidate.provenance.contributor.trim().length === 0) {
    addSchemaError('provenance.contributor', 'Contributor attribution is required');
  }
  if (candidate?.provenance?.license !== 'CC-BY-4.0') {
    addSchemaError('provenance.license', 'Submission data must use the CC-BY-4.0 license');
  }
  schema.valid = schema.errors.length === 0;
  const verification = verifyAtlasRecord(candidate);
  const fingerprint = verification.normalizedProblem && verification.normalizedState
    ? packingFingerprint(verification.normalizedProblem, verification.normalizedState)
    : null;
  let candidateIdentity = null;
  if (schema.valid && verification.valid) {
    try {
      candidateIdentity = packingProblemIdentity(candidate.problem);
    } catch {
      candidateIdentity = null;
    }
  }
  const indexedResult = queryVerifiedIncumbentIndex(publishedRecords, fingerprint, candidateIdentity);
  const indexed = indexedResult !== null;
  const safeIncumbents = [];
  let quarantinedIncumbents = 0;
  for (const record of indexed ? [] : (Array.isArray(publishedRecords) ? publishedRecords : [])) {
    if (!record || typeof record !== 'object' || !record.verification?.valid ||
      typeof record.verification.fingerprint !== 'string' ||
      !Number.isFinite(record.verification.utilization)) {
      quarantinedIncumbents += 1;
      continue;
    }
    try {
      safeIncumbents.push({ record, identity: packingProblemIdentity(record.problem) });
    } catch {
      quarantinedIncumbents += 1;
    }
  }
  const comparable = candidateIdentity === null ? [] : indexed
    ? indexedResult.comparable
    : safeIncumbents.filter(entry => entry.identity === candidateIdentity).map(entry => entry.record);
  const duplicate = indexed
    ? indexedResult.duplicate
    : safeIncumbents.map(entry => entry.record)
      .find(record => record.verification.fingerprint === fingerprint);
  const best = comparable
    .filter(record => record.verification?.valid)
    .sort((a, b) => b.verification.utilization - a.verification.utilization)[0];
  const candidateUtilization = verification.metrics?.utilization ?? 0;
  const delta = best ? candidateUtilization - best.verification.utilization : null;
  let disposition = 'review';
  if (!schema.valid || !verification.valid) disposition = 'reject_invalid';
  else if (duplicate) disposition = 'reject_duplicate';
  else if (best && delta <= 1e-9) disposition = 'reject_inferior';
  else if (!best) disposition = 'new_problem';
  else disposition = 'improves_record';
  return {
    schema,
    verification,
    comparison: {
      comparableRecords: comparable.map(record => record.id),
      duplicateOf: duplicate?.id ?? null,
      bestKnownId: best?.id ?? null,
      bestKnownUtilization: best?.verification?.utilization ?? null,
      candidateUtilization,
      improvement: delta,
      quarantinedIncumbents,
      comparisonMode: indexed ? 'verified_index' : 'record_scan'
    },
    disposition,
    humanReviewRequired: ['published', 'proven_optimal'].includes(candidate?.evidence?.status)
  };
}

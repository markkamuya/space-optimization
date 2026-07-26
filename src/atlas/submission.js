import { packingFingerprint } from './fingerprint.js';
import { validateRecordShape } from './schema.js';
import { verifyAtlasRecord } from './verifier.js';

function problemKey(problem) {
  const triangles = [...problem.triangles]
    .map(triangle => [...triangle.sides].sort((a, b) => a - b).map(value => Number(value.toFixed(9))).join(','))
    .sort();
  return JSON.stringify({
    width: Number(problem.width.toFixed(9)),
    height: Number(problem.height.toFixed(9)),
    margin: Number((problem.margin ?? 0).toFixed(9)),
    kerf: Number((problem.kerf ?? 0).toFixed(9)),
    triangles
  });
}

export function assessSubmission(candidate, publishedRecords) {
  const schema = validateRecordShape(candidate);
  const verification = verifyAtlasRecord(candidate);
  const fingerprint = verification.normalizedProblem && verification.normalizedState
    ? packingFingerprint(verification.normalizedProblem, verification.normalizedState)
    : null;
  const comparable = publishedRecords.filter(record => problemKey(record.problem) === problemKey(candidate.problem));
  const duplicate = publishedRecords.find(record => record.verification?.fingerprint === fingerprint);
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
      improvement: delta
    },
    disposition,
    humanReviewRequired: ['published', 'proven_optimal'].includes(candidate?.evidence?.status)
  };
}

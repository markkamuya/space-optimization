export function buildWorkQueue(records) {
  return records
    .filter(record => record.bounds.optimalityGap > 0)
    .sort((a, b) => b.bounds.optimalityGap - a.bounds.optimalityGap)
    .map((record, index) => ({
      taskId: `v2-${String(index + 1).padStart(4, '0')}`,
      recordId: record.id,
      experimentId: record.experimentId,
      priority: record.bounds.optimalityGap >= 0.1 ? 'high' : record.bounds.optimalityGap >= 0.04 ? 'medium' : 'low',
      objective: 'Improve the verified lower bound or attach a stronger rigorous upper bound.',
      baselineFingerprint: record.verification.fingerprint,
      baselineUtilization: record.verification.utilization,
      upperBound: record.bounds.upperBound,
      budget: { orientationEvaluations: 5000, wallTimeSeconds: 900 },
      submissionContract: {
        deterministicSeedRequired: true,
        coordinatesRequired: true,
        independentVerificationRequired: true
      },
      status: 'open'
    }));
}

export function validateWorkerResult(task, candidate, assignedRecord) {
  const errors = [];
  if (candidate.recordId !== task.recordId) errors.push('record_id_mismatch');
  if (!candidate.seed) errors.push('missing_seed');
  if (!candidate.problem || typeof candidate.problem !== 'object') errors.push('missing_problem');
  if (!Array.isArray(candidate.placements)) errors.push('missing_coordinates');
  if (!Number.isFinite(candidate.utilization)) errors.push('missing_utilization');
  if (!assignedRecord || assignedRecord.id !== task.recordId) errors.push('assigned_record_mismatch');

  let verification = null;
  if (assignedRecord && candidate.problem && Array.isArray(candidate.placements)) {
    try {
      if (packingProblemIdentity(candidate.problem) !== packingProblemIdentity(assignedRecord.problem)) {
        errors.push('problem_identity_mismatch');
      }
    } catch {
      errors.push('invalid_problem_identity');
    }
    verification = verifyPacking(candidate.problem, candidate.placements);
    if (!verification.valid) errors.push('invalid_geometry');
    if (verification.metrics && Number.isFinite(candidate.utilization) &&
      Math.abs(verification.metrics.utilization - candidate.utilization) > 1e-10) {
      errors.push('utilization_mismatch');
    }
    if (verification.metrics && verification.metrics.utilization <= task.baselineUtilization + 1e-10) {
      errors.push('does_not_improve_baseline');
    }
  }
  return { valid: errors.length === 0, errors, verification };
}
import { packingProblemIdentity } from '../atlas/submission.js';
import { verifyPacking } from '../atlas/verifier.js';

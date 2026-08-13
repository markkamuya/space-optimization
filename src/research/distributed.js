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
  const queuedTask = task && typeof task === 'object' && !Array.isArray(task) ? task : {};
  const submitted = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : {};
  if (queuedTask !== task) errors.push('invalid_task');
  if (submitted !== candidate) errors.push('invalid_candidate');
  if (submitted.taskId !== queuedTask.taskId) errors.push('task_id_mismatch');
  if (submitted.recordId !== queuedTask.recordId) errors.push('record_id_mismatch');
  if (submitted.experimentId !== queuedTask.experimentId) errors.push('experiment_id_mismatch');
  if (queuedTask.experimentId !== assignedRecord?.experimentId) errors.push('task_experiment_mismatch');
  if (queuedTask.baselineFingerprint !== assignedRecord?.verification?.fingerprint) {
    errors.push('stale_baseline_fingerprint');
  }
  if (!Number.isFinite(queuedTask.baselineUtilization) ||
    Math.abs(queuedTask.baselineUtilization - (assignedRecord?.verification?.utilization ?? NaN)) > 1e-10) {
    errors.push('stale_baseline_utilization');
  }
  if (submitted.seed === undefined || submitted.seed === null || submitted.seed === '') errors.push('missing_seed');
  if (typeof submitted.solverVersion !== 'string' || submitted.solverVersion.trim().length === 0) {
    errors.push('missing_solver_version');
  }
  if (!submitted.problem || typeof submitted.problem !== 'object') errors.push('missing_problem');
  if (!Array.isArray(submitted.placements)) errors.push('missing_coordinates');
  if (!Number.isFinite(submitted.utilization)) errors.push('missing_utilization');
  if (!assignedRecord || assignedRecord.id !== queuedTask.recordId) errors.push('assigned_record_mismatch');

  let verification = null;
  if (assignedRecord && submitted.problem && Array.isArray(submitted.placements)) {
    try {
      if (packingProblemIdentity(submitted.problem) !== packingProblemIdentity(assignedRecord.problem)) {
        errors.push('problem_identity_mismatch');
      }
    } catch {
      errors.push('invalid_problem_identity');
    }
    try {
      verification = verifyPacking(submitted.problem, submitted.placements);
      if (!verification.valid) errors.push('invalid_geometry');
      if (verification.metrics && Number.isFinite(submitted.utilization) &&
        Math.abs(verification.metrics.utilization - submitted.utilization) > 1e-10) {
        errors.push('utilization_mismatch');
      }
      if (verification.metrics && verification.metrics.utilization <= queuedTask.baselineUtilization + 1e-10) {
        errors.push('does_not_improve_baseline');
      }
    } catch {
      errors.push('invalid_geometry');
    }
  }
  return { valid: errors.length === 0, errors, verification };
}
import { packingProblemIdentity } from '../atlas/submission.js';
import { verifyPacking } from '../atlas/verifier.js';

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

export function validateWorkerResult(task, candidate) {
  const errors = [];
  if (candidate.recordId !== task.recordId) errors.push('record_id_mismatch');
  if (!candidate.seed) errors.push('missing_seed');
  if (!Array.isArray(candidate.placements)) errors.push('missing_coordinates');
  if (!Number.isFinite(candidate.utilization)) errors.push('missing_utilization');
  if (candidate.utilization <= task.baselineUtilization) errors.push('does_not_improve_baseline');
  return { valid: errors.length === 0, errors };
}

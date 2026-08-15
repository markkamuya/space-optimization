export function validatePublicRelease(release) {
  const errors = [];
  if (!release || typeof release !== 'object' || Array.isArray(release)) errors.push('release_not_object');
  if (!Array.isArray(release?.records)) errors.push('records_missing');
  if (!Array.isArray(release?.transitions)) errors.push('transitions_missing');
  if (!release?.coverage || typeof release.coverage !== 'object') errors.push('coverage_missing');
  if (release?.coverage && Array.isArray(release?.records)) {
    if (release.coverage.records !== release.records.length) errors.push('coverage_records_mismatch');
    if (release.coverage.verified !== release.records.filter(record => record?.verification?.valid === true).length) {
      errors.push('coverage_verified_mismatch');
    }
    if (Array.isArray(release.transitions) && release.coverage.phaseTransitions !== release.transitions.length) {
      errors.push('coverage_transitions_mismatch');
    }
  }
  for (const [index, record] of (release?.records ?? []).entries()) {
    if (record?.verification?.valid !== true) errors.push(`record_unverified:${index}`);
    if (record?.verification?.stability?.format !== 'triangle-packing-stability/v1' ||
      record.verification.stability.valid !== true) errors.push(`record_stability_invalid:${index}`);
    if (!record?.id || typeof record.id !== 'string') errors.push(`record_id_invalid:${index}`);
    if (!record?.problem || !Array.isArray(record?.solution?.placements)) {
      errors.push(`record_geometry_missing:${index}`);
    }
    for (const value of [record?.verification?.utilization, record?.bounds?.optimalityGap]) {
      if (!Number.isFinite(value)) errors.push(`record_metric_invalid:${index}`);
    }
  }
  return { valid: errors.length === 0, errors };
}

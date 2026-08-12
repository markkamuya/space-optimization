export function validatePublicRelease(release) {
  const errors = [];
  if (!release || typeof release !== 'object' || Array.isArray(release)) errors.push('release_not_object');
  if (!Array.isArray(release?.records)) errors.push('records_missing');
  if (!Array.isArray(release?.transitions)) errors.push('transitions_missing');
  if (!release?.coverage || typeof release.coverage !== 'object') errors.push('coverage_missing');
  for (const [index, record] of (release?.records ?? []).entries()) {
    if (record?.verification?.valid !== true) errors.push(`record_unverified:${index}`);
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

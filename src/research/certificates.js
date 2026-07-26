import { verifyAtlasRecord } from '../atlas/verifier.js';

const EPSILON = 1e-7;

export function verifyCertificate(certificate, record) {
  const errors = [];
  if (certificate.recordId !== record.id) errors.push('record_id_mismatch');
  const packing = verifyAtlasRecord(record);
  if (!packing.valid) errors.push('packing_invalid');

  if (certificate.type === 'exact_tiling') {
    if (Math.abs(packing.metrics.utilization - 1) > EPSILON) errors.push('not_full_area');
    if (packing.metrics.overlapArea > EPSILON) errors.push('positive_overlap');
    if (packing.metrics.boundaryOverflow > EPSILON) errors.push('boundary_overflow');
    if (certificate.upperBound !== 1) errors.push('invalid_upper_bound');
  } else if (certificate.type === 'area_count') {
    const usableArea = (record.problem.width - record.problem.margin * 2) *
      (record.problem.height - record.problem.margin * 2);
    const pieceArea = packing.metrics.triangleArea / record.solution.placements.length;
    const maximumCount = Math.floor((usableArea + 1e-9) / pieceArea);
    if (certificate.maximumCount !== maximumCount) errors.push('count_bound_mismatch');
    if (record.solution.placements.length > maximumCount) errors.push('count_exceeds_bound');
  } else {
    errors.push('unsupported_certificate_type');
  }

  return {
    valid: errors.length === 0,
    errors,
    recordId: record.id,
    certificateType: certificate.type,
    independentlyVerifiedPacking: packing.valid
  };
}

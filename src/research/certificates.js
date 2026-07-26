import { verifyAtlasRecord } from '../atlas/verifier.js';
import { fromSSS, isInsideBounds, overlaps, transform } from '../geometry/triangle.js';

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

export function verifyFiniteDomainCertificate(certificate) {
  const errors = [];
  if (certificate?.type !== 'finite_candidate_domain') errors.push('unsupported_certificate_type');
  const candidates = certificate?.candidates ?? [];
  const selected = certificate?.selectedIndices ?? [];
  const cover = certificate?.cliqueCover ?? [];
  const shape = fromSSS(...(certificate?.problem?.sides ?? [1, 1, 1]));
  const container = {
    minX: 0,
    minY: 0,
    maxX: Number(certificate?.problem?.width),
    maxY: Number(certificate?.problem?.height)
  };
  if (![container.maxX, container.maxY].every(Number.isFinite)) errors.push('invalid_container');
  const transformed = candidates.map(candidate => transform(shape, candidate));
  const covered = new Set(cover.flat());
  if (covered.size !== candidates.length || [...covered].some(index => index < 0 || index >= candidates.length)) {
    errors.push('clique_cover_incomplete');
  }
  for (const clique of cover) {
    for (let left = 0; left < clique.length; left += 1) {
      for (let right = left + 1; right < clique.length; right += 1) {
        if (!overlaps(transformed[clique[left]], transformed[clique[right]])) {
          errors.push('invalid_clique_edge');
        }
      }
    }
  }
  for (const index of selected) {
    if (!Number.isInteger(index) || index < 0 || index >= candidates.length) errors.push('invalid_selected_index');
    else if (!isInsideBounds(transformed[index], container, EPSILON)) errors.push('selected_out_of_bounds');
  }
  for (let left = 0; left < selected.length; left += 1) {
    for (let right = left + 1; right < selected.length; right += 1) {
      if (overlaps(transformed[selected[left]], transformed[selected[right]])) errors.push('selected_overlap');
    }
  }
  if (selected.length !== cover.length) errors.push('upper_lower_bound_mismatch');
  return {
    valid: errors.length === 0,
    errors: [...new Set(errors)],
    scope: 'declared_finite_candidate_domain_only',
    candidateCount: candidates.length,
    optimum: errors.length === 0 ? selected.length : null,
    globallyOptimal: false
  };
}

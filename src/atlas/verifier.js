import { normalizeProblem, serializableProblem } from '../core/problem.js';
import { evaluate } from '../solvers/scoring.js';
import { ATLAS_FORMAT, EVIDENCE_STATES, VERIFICATION_TOLERANCE } from './constants.js';
import { packingFingerprint } from './fingerprint.js';

function issue(code, message, path = '') {
  return { code, message, path };
}

export function areaUpperBound(problem) {
  const usableArea = (problem.width - problem.margin * 2) *
    (problem.height - problem.margin * 2);
  return {
    type: 'container_area',
    area: usableArea,
    utilization: 1,
    rigorous: true
  };
}

export function verifyPacking(problemInput, stateInput) {
  const errors = [];
  let problem;
  try {
    problem = normalizeProblem(problemInput);
  } catch (error) {
    return { valid: false, errors: [issue('INVALID_PROBLEM', error.message, 'problem')], warnings: [] };
  }
  if (!Array.isArray(stateInput) || stateInput.length !== problem.triangles.length) {
    return {
      valid: false,
      errors: [issue(
        'PLACEMENT_COUNT_MISMATCH',
        `Expected ${problem.triangles.length} placements; received ${stateInput?.length ?? 0}`,
        'solution.placements'
      )],
      warnings: []
    };
  }
  const state = stateInput.map((placement, index) => {
    const normalized = {
      x: Number(placement.x),
      y: Number(placement.y),
      angle: Number(placement.angle ?? 0),
      reflect: Boolean(placement.reflect)
    };
    if (![normalized.x, normalized.y, normalized.angle].every(Number.isFinite)) {
      errors.push(issue('INVALID_PLACEMENT', 'Placement coordinates and angle must be finite', `solution.placements.${index}`));
    }
    if (normalized.reflect && !problem.allowReflection) {
      errors.push(issue('REFLECTION_NOT_ALLOWED', 'Placement uses reflection but the problem forbids it', `solution.placements.${index}`));
    }
    if (Math.abs(normalized.angle) > VERIFICATION_TOLERANCE.coordinateEpsilon && !problem.allowRotation) {
      errors.push(issue('ROTATION_NOT_ALLOWED', 'Placement uses rotation but the problem forbids it', `solution.placements.${index}`));
    }
    return normalized;
  });
  if (errors.length > 0) return { valid: false, errors, warnings: [] };

  const metrics = evaluate(problem, state);
  if (metrics.overlapArea > VERIFICATION_TOLERANCE.overlapAreaEpsilon) {
    errors.push(issue('OVERLAP', `Positive overlap area: ${metrics.overlapArea}`, 'solution.placements'));
  }
  if (metrics.boundaryOverflow > VERIFICATION_TOLERANCE.boundaryEpsilon) {
    errors.push(issue('OUT_OF_BOUNDS', `Boundary overflow: ${metrics.boundaryOverflow}`, 'solution.placements'));
  }
  if (metrics.spacingViolation > VERIFICATION_TOLERANCE.spacingEpsilon) {
    errors.push(issue('SPACING_VIOLATION', `Spacing shortfall: ${metrics.spacingViolation}`, 'solution.placements'));
  }
  const upperBound = areaUpperBound(problem);
  return {
    valid: errors.length === 0,
    errors,
    warnings: [],
    metrics,
    upperBound,
    optimalityGap: upperBound.utilization - metrics.utilization,
    fingerprint: packingFingerprint(problem, state),
    normalizedProblem: serializableProblem(problem),
    normalizedState: state
  };
}

export function verifyAtlasRecord(record) {
  const errors = [];
  if (record?.format !== ATLAS_FORMAT) {
    errors.push(issue('INVALID_FORMAT', `Expected format ${ATLAS_FORMAT}`, 'format'));
  }
  if (!EVIDENCE_STATES.includes(record?.evidence?.status)) {
    errors.push(issue('INVALID_EVIDENCE', 'Unknown or missing evidence status', 'evidence.status'));
  }
  if (!record?.id || typeof record.id !== 'string') {
    errors.push(issue('MISSING_ID', 'Atlas record requires a stable id', 'id'));
  }
  const packing = verifyPacking(record?.problem, record?.solution?.placements);
  errors.push(...packing.errors);
  if (record?.evidence?.status === 'proven_optimal' && !record?.evidence?.proof) {
    errors.push(issue('MISSING_PROOF', 'Proven-optimal records require proof metadata', 'evidence.proof'));
  }
  return { ...packing, valid: errors.length === 0, errors };
}

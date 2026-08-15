import { normalizeProblem } from '../core/problem.js';
import { bounds, polygonDistance } from '../geometry/triangle.js';
import { placedTriangles } from '../solvers/scoring.js';
import { VERIFICATION_TOLERANCE } from '../atlas/constants.js';
import { verifyPacking } from '../atlas/verifier.js';

export const STABILITY_FORMAT = 'triangle-packing-stability/v1';
export const CONTACT_EPSILON = 1e-9;

const minimum = values => values.length === 0 ? null : Math.min(...values);
const stableNumber = value => value === null ? null : Number(value.toPrecision(15));

export function certifyPackingStability(problemInput, state) {
  const problem = normalizeProblem(problemInput);
  const verification = verifyPacking(problem, state);
  if (!verification.metrics) {
    return {
      format: STABILITY_FORMAT,
      classification: 'invalid',
      valid: false,
      reason: verification.errors.map(error => error.code).join(',')
    };
  }

  const placed = placedTriangles(problem, verification.normalizedState);
  const usable = {
    minX: problem.margin,
    minY: problem.margin,
    maxX: problem.width - problem.margin,
    maxY: problem.height - problem.margin
  };
  const boundarySlacks = placed.flatMap(item => {
    const box = bounds(item.placed);
    return [box.minX - usable.minX, usable.maxX - box.maxX,
      box.minY - usable.minY, usable.maxY - box.maxY];
  });
  const pairClearances = [];
  for (let left = 0; left < placed.length; left += 1) {
    for (let right = left + 1; right < placed.length; right += 1) {
      pairClearances.push(polygonDistance(
        placed[left].placed, placed[right].placed
      ) - problem.kerf);
    }
  }

  const minimumBoundarySlack = minimum(boundarySlacks);
  const minimumPairClearance = minimum(pairClearances);
  const acceptedViolation = Math.max(verification.metrics.overlapArea,
    verification.metrics.boundaryOverflow, verification.metrics.spacingViolation);
  let classification = 'robust';
  if (!verification.valid) classification = 'invalid';
  else if (acceptedViolation > CONTACT_EPSILON) classification = 'tolerance_dependent';
  else if ((minimumBoundarySlack !== null && minimumBoundarySlack <= CONTACT_EPSILON) ||
    (minimumPairClearance !== null && minimumPairClearance <= CONTACT_EPSILON)) {
    classification = 'contact';
  }

  return {
    format: STABILITY_FORMAT,
    classification,
    valid: verification.valid,
    minimumBoundarySlack: stableNumber(minimumBoundarySlack),
    minimumPairClearance: stableNumber(minimumPairClearance),
    acceptedViolation: stableNumber(acceptedViolation),
    contactEpsilon: CONTACT_EPSILON,
    acceptanceTolerance: Math.max(VERIFICATION_TOLERANCE.overlapAreaEpsilon,
      VERIFICATION_TOLERANCE.boundaryEpsilon, VERIFICATION_TOLERANCE.spacingEpsilon),
    boundaryConstraints: boundarySlacks.length,
    pairConstraints: pairClearances.length
  };
}

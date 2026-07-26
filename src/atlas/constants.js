export const ATLAS_FORMAT = 'triangle-packing-atlas/v1';
export const EVIDENCE_STATES = Object.freeze([
  'proven_optimal',
  'published',
  'verified_construction',
  'best_computational',
  'candidate',
  'open',
  'disputed'
]);

export const VERIFICATION_TOLERANCE = Object.freeze({
  coordinateEpsilon: 1e-9,
  overlapAreaEpsilon: 1e-7,
  boundaryEpsilon: 1e-7,
  spacingEpsilon: 1e-7,
  congruenceEpsilon: 1e-7
});

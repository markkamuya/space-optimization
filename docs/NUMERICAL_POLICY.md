# Numerical verification policy

Atlas records are independently reconstructed from their problem definition and
placements. A solver's own validity claim is never trusted.

The version-one verifier uses double-precision coordinates with:

- coordinate epsilon: `1e-9`;
- positive-overlap-area tolerance: `1e-7`;
- boundary-overflow tolerance: `1e-7`;
- spacing-shortfall tolerance: `1e-7`;
- congruence tolerance: `1e-7`.

Touching edges and vertices are permitted when spacing is zero. A positive
intersection area above tolerance is an overlap. Results within tolerance are
computationally verified, not exact proofs.

`proven_optimal` is a human-reviewed evidence state. It requires proof metadata
and cannot be inferred from runtime, search effort, utilization, or verifier
success.

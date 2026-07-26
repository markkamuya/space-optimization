# Mathematical certificates in Atlas v2

Atlas claims are bounded by the scope of their machine-checkable certificates.

## Global certificates

`exact_tiling` combines independently verified containment, zero overlap, and
utilization one with the universal container-area upper bound. A valid exact
tiling therefore proves global optimality for the declared problem.

`area_count` uses the floor of usable container area divided by homogeneous
piece area. It is a rigorous global count upper bound, although it is often not
tight.

## Finite candidate-domain certificates

`finite_candidate_domain` proves an optimum only among an explicitly enumerated
set of placements. The certificate contains:

- every candidate coordinate and orientation;
- a non-overlapping selected subset;
- a clique cover of the candidate-overlap graph.

Each clique contributes at most one placement to any valid packing. When the
number of cliques equals the selected subset size, matching upper and lower
bounds prove optimality within that declared finite domain.

This does **not** prove global optimality in continuous packing space. The
verifier returns `globallyOptimal: false`, and the Atlas must display the state
as `domain_optimal`, never `proven_optimal`.

Proof and literature claims still require human review even after machine
verification.

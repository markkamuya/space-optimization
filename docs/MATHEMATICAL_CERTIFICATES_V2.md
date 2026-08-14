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

### Certified proof lifecycle

Atlas v2 publishes its reviewed control proofs in
`public/finite-domain-proofs-v2.json`. Each proof links to a canonical record
only to identify the triangle family; its smaller rectangle and declared grid
remain a separate control problem. The index deliberately uses the wording
“finite candidate domain” and never upgrades the linked record to globally
optimal.

The v3 certificate binds the candidate list, regenerated conflict graph,
maximum independent set, minimum clique cover, solver budget, and full
canonical payload with SHA-256 digests. The JavaScript release audit and the
independent Python standard-library verifier both reconstruct the domain and
graph. A changed coordinate, edge, cover, claim boundary, record link, or
digest blocks the release.

Reproduce the published control with:

```sh
npm run atlas:v2
npm run atlas:finite-domain-cross-verify -- public/finite-domain-proofs-v2.json
npm run atlas:finite-domain-benchmark
```

The original generation parameters are archived at
`proofs/finite-domain-right-control.spec.json`. The schema continues to accept
legacy v2 finite-domain certificates while the verifier and published index use
the digest-bound v3 format.

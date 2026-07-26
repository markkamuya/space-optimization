# Research release 2 methodology

## Sampling

The isosceles study samples 16 apex angles from 35° through 110° and 16
rectangle ratios from 0.75:1 through 3:1. Three normalized scalene angle slices
are sampled across the same rectangle ratios. Scale is fixed within the study
so finite boundary effects remain comparable.

## Solver portfolio

Each cell runs horizontal, vertical, and diagonal lattice constructors, exact
enumeration over a restricted orientation domain, boundary-focused local search,
and a deterministic evolutionary orientation search under a shared budget. The
largest independently valid piece set is retained. The constraint solver is
exact only for its declared discrete orientation domain, not for continuous
packing space. Solver traces include orientation, iterations, piece count,
density, declared portable runtime, algorithm version, and deterministic seed.
Machine-specific build metadata is emitted separately in
`public/build-environment.json`, outside the immutable dataset payload, so the
dataset checksum remains stable across supported platforms.

This is a reproducible baseline portfolio—not a claim that the best lattice is
the globally best packing.

## Verification and bounds

All coordinates are replayed through the independent overlap and boundary
verifier. The construction supplies a lower bound. The release attaches the
container-area bound and the homogeneous area/count bound; the smallest
rigorous value is the published upper bound.

The downloadable snapshot stores each homogeneous triangle definition once,
alongside its count and complete placement array. Release generation expands
that compact representation for independent replay; no coordinates are omitted.

Projection and boundary-exclusion entries are present only as explicitly
unsupported methods until a record carries a reviewable, orientation-safe
certificate. This prevents an algorithmic estimate from being presented as a
proof.

## Phase classification and uncertainty

Pattern labels derive from the winning construction family and orientation.
Every map cell links to a sampled record. Between samples, the interface reports
normalized distance to the nearest computed cell. Opacity encodes the remaining
optimality gap, not subjective confidence.

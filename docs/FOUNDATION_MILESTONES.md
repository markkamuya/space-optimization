# Foundation milestone status

## Milestone 1 — Trusted verifier

Implemented:

- independent reconstruction and scoring;
- overlap, boundary, spacing, rotation, and reflection validation;
- stable packing fingerprints;
- area upper bound and optimality gap;
- numerical policy;
- command-line verification.

## Milestone 2 — Open data standard

Implemented:

- `triangle-packing-atlas/v1`;
- JSON schemas for problems and records;
- seven evidence states;
- provenance, proof, and citation fields;
- version-controlled atlas directory and verified example.

## Milestone 3 — Reference constructions

Implemented:

- proven rectangular grids of congruent right-triangle pairs;
- verified alternating-row equilateral construction;
- construction catalog and regression tests.

## Milestone 4 — Benchmark corpus

Implemented:

- known-optimum control;
- finite-boundary equilateral reference;
- open heterogeneous computational case;
- machine-readable expectations and regression runner.

## Milestone 5 — Solver laboratory

Implemented:

- common solver contract;
- capability registry;
- independently verified output;
- compact baseline and seeded multi-start adapters;
- solver comparison runner.

The next product milestone is the interactive Atlas interface. It should consume
these APIs and records rather than inventing a second representation.

# Triangle Packing Atlas

Triangle Packing Atlas is an open, reproducible record of triangle-packing
constructions, computational results, and unresolved problems. It combines an
independent geometry verifier, versioned data standard, reference
constructions, benchmark corpus, solver laboratory, and interactive viewer.

The hosted interface is Atlas-first: it exposes a phase map, family slices,
verified record pages, pattern comparisons, boundary-waste analysis, historical
timelines, open problems, and a contribution path. The verifier and release
dataset remain the source of truth.

## Why it is different

- Validated SSS, SAS, and AAS construction primitives
- Epsilon-aware collision semantics where edge contact is permitted
- Exact triangle intersection area and explicit kerf constraints
- Deterministic compact bottom-left baseline
- Seeded multi-start refinement with live progress and cancellation
- Repeatable-type fill mode that maximizes covered sheet area
- Residual-gap pass for rotated pieces along borders and exposed pockets
- Side-by-side results and convergence visualization
- Utilization, overlap, boundary, spacing, runtime, and score metrics
- JSON import plus SVG, DXF, and JSON export
- Responsive, keyboard-accessible interface
- Automated tests, benchmarks, and continuous integration

The optimizer reports a **best-known heuristic layout**, not a proven global
optimum.

## Run locally

```bash
npm install
npm run dev
```

Open the local address printed by Vite.

## Verification

```bash
npm test
npm run build
npm run benchmark
npm run atlas:benchmark
npm run atlas:verify -- atlas/right/right-grid-2x1.json
npm run atlas:release
npm run atlas:research
npm run atlas:submission -- atlas/path/to/candidate.json
npm run atlas:archive
```

## Project map

```text
src/
  atlas/        verification, evidence states, fingerprints
  constructions/ exact and reference mathematical generators
  core/         problem definitions, seeded random generator, exports
  geometry/     constructions, transforms, predicates, intersection
  rendering/    canvas packing and convergence rendering
  solvers/      independent scoring, compact baseline, multi-start search
test/           geometry, problem, and solver regression tests
benchmarks/     reproducible solver fixtures
atlas/          version-controlled verified packing records
schemas/        versioned JSON data contracts
docs/           architecture and contribution guidance
```

See [ROADMAP.md](ROADMAP.md) for the six product milestones and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

Foundation status is documented in
[docs/FOUNDATION_MILESTONES.md](docs/FOUNDATION_MILESTONES.md).

See [docs/ATLAS_RELEASE_1.md](docs/ATLAS_RELEASE_1.md) for the public dataset
scope, [docs/CONTRIBUTION_PIPELINE.md](docs/CONTRIBUTION_PIPELINE.md) for pull
request submissions, and [docs/RESEARCH_EXPANSION.md](docs/RESEARCH_EXPANSION.md)
for the sustained research program.

Research release 2 contains 304 independently verified records, deterministic
portfolio traces, rigorous area/count bounds, computed phase classifications,
and a checksummed DOI-ready snapshot. See
[docs/METHODOLOGY_V2.md](docs/METHODOLOGY_V2.md).

## Constraint model

A solution is valid when every triangle remains inside the usable sheet, no two
triangles have positive overlapping area, and every pair observes the requested
kerf distance. Margin reduces the usable sheet on every edge.

Fill mode treats the entered triangles as repeatable types. With zero spacing,
the solver evaluates lattice tilings for every type and selects the valid layout
with the greatest covered area. It then searches all border corners and exposed
piece vertices for additional rotated placements, repeating until no candidate
fits. With spacing enabled or fixed-set mode selected, the general compact
candidate search is used.

Utilization is:

```text
sum of triangle areas / usable sheet area
```

## License

MIT

# Forma — Triangle Packing Lab

Forma is an interactive computational-geometry laboratory for packing
heterogeneous triangles into rectangular sheets. It makes heuristic
optimization inspectable: every experiment has a seed, a deterministic
baseline, independent validity metrics, convergence history, and
scale-preserving exports.

## Why it is different

- Validated SSS, SAS, and AAS construction primitives
- Epsilon-aware collision semantics where edge contact is permitted
- Exact triangle intersection area and explicit kerf constraints
- Deterministic compact bottom-left baseline
- Seeded multi-start refinement with live progress and cancellation
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
```

## Project map

```text
src/
  core/         problem definitions, seeded random generator, exports
  geometry/     constructions, transforms, predicates, intersection
  rendering/    canvas packing and convergence rendering
  solvers/      independent scoring, compact baseline, multi-start search
test/           geometry, problem, and solver regression tests
benchmarks/     reproducible solver fixtures
docs/           architecture and contribution guidance
```

See [ROADMAP.md](ROADMAP.md) for the six product milestones and
[docs/ARCHITECTURE.md](docs/ARCHITECTURE.md) for the design.

## Constraint model

A solution is valid when every triangle remains inside the usable sheet, no two
triangles have positive overlapping area, and every pair observes the requested
kerf distance. Margin reduces the usable sheet on every edge.

Utilization is:

```text
sum of triangle areas / usable sheet area
```

## License

MIT

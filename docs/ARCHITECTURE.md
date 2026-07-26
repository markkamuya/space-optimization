# Architecture

Forma separates mathematical truth from presentation. The browser is a client
of the same pure modules exercised by the automated tests and benchmarks.

```text
Problem definition
       │
       ▼
Geometry kernel ──────► independent scoring
       │                        ▲
       ▼                        │
Greedy baseline ──────► simulated annealing
       │                        │
       └──────────┬─────────────┘
                  ▼
          renderer and exports
```

## Geometry

`src/geometry/triangle.js` owns validated construction, transforms, bounds,
intersection, overlap area, and polygon distance. It uses a documented
epsilon, and contact without positive intersecting area is not an overlap.

## Problems

`src/core/problem.js` converts imported or form-authored data into one canonical
problem. A problem includes its sheet, margin, kerf, transform permissions,
seed, and triangle definitions. `serializableProblem` is the stable persistence
boundary.

## Solvers and scoring

Solvers return the same shape: placements, metrics, iterations, runtime, and
history. `src/solvers/scoring.js` is independent of any solver so solutions can
be verified rather than trusted.

The objective combines:

```text
overlap area × 100,000
+ boundary overflow × 100,000
+ kerf shortfall × 10,000
+ occupied bounding area
```

The greedy solver provides a deterministic baseline. Seeded simulated annealing
starts from that baseline and retains the best-known state, so it cannot return
a lower-quality score than its starting solution.

## Rendering and export

Canvas rendering is a projection of solver output. SVG, DXF, and JSON exporters
consume the same coordinates; they never reconstruct geometry from pixels.

## Terminology

“Valid” means the independent scorer found no overlap, boundary, or spacing
violations within tolerance. “Best found” is a heuristic result. The application
does not claim or imply a proof of global optimality.

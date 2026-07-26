# Triangle Packing Roadmap

The project will evolve from a browser prototype into a reproducible
computational-geometry and packing laboratory. Each milestone has an observable
completion condition so that progress is measured by capability rather than by
the number of features added.

## Milestone 1 — Trusted geometry foundation

**Goal:** Make triangle construction and geometric predicates reliable,
reusable, and independently testable.

- Introduce canonical `Point` and `Triangle` representations.
- Implement validated SSS, SAS, and AAS constructors.
- Implement transforms, bounds checks, area, and epsilon-aware intersection.
- Define edge contact as valid packing contact rather than overlap.
- Add automated tests for normal, degenerate, touching, rotated, and
  out-of-bounds cases.
- Gradually replace duplicate geometry code in the browser application.

**Complete when:** the geometry test suite passes, UI construction uses the
shared module, and no duplicate collision implementation remains.

## Milestone 2 — Packing problem and baseline solver

**Goal:** Give every solver the same explicit inputs, constraints, and outputs.

- Define fixed-container and minimum-container problem models.
- Support heterogeneous triangles, rotation/reflection rules, spacing, and seed.
- Implement deterministic greedy placement as a baseline.
- Report utilization, bounding area, violations, runtime, and iteration count.
- Add fixtures with known or easily verified arrangements.

**Complete when:** a seeded problem produces the same valid result on every run
and can be scored independently of its renderer.

## Milestone 3 — Optimization engine

**Goal:** Produce consistently strong layouts rather than merely random valid
ones.

- Replace binary penalties with continuous overlap and boundary penalties.
- Rebuild simulated annealing against the common solver interface.
- Add multiple restarts, adaptive moves, cancellation, and progress events.
- Compare against the greedy baseline and retain the best valid solution.
- Add benchmark datasets and regression thresholds.

**Complete when:** the optimizer reliably beats the baseline on the benchmark
suite without returning invalid layouts.

## Milestone 4 — Interactive optimization lab

**Goal:** Make the algorithm understandable and enjoyable to explore.

- Separate editor state, rendering, controls, and solver execution.
- Show live best/current layouts and a convergence chart.
- Add pause, resume, cancel, replay, seed, and solver controls.
- Display utilization, violations, iterations, and elapsed time.
- Provide side-by-side solver comparison.

**Complete when:** a user can configure, run, inspect, reproduce, and compare
packing experiments without opening developer tools.

## Milestone 5 — Real-world workflow

**Goal:** Make results useful outside the demonstration.

- Add SVG, JSON, and DXF export.
- Support units, margins, and cutting kerf.
- Add importable problem files and shareable experiment settings.
- Improve responsive and keyboard-accessible editing.

**Complete when:** an exported layout preserves scale and constraints when
opened in an external design or fabrication tool.

## Milestone 6 — Proof, polish, and release

**Goal:** Present the project as a credible engineering and mathematics work.

- Publish benchmark methodology and results.
- Distinguish best-known heuristic results from proven optima.
- Add an architecture guide, algorithm explanations, and contribution guide.
- Add continuous integration, a live demo, screenshots, and a short demo video.
- Profile and optimize large problem instances.

**Complete when:** the hosted project is documented, tested automatically, and
demonstrates its claims with reproducible evidence.

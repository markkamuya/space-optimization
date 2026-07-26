# Solver interface

All computational solvers are registered in `src/solvers/registry.js`.

A solver receives:

```js
solve(problem, {
  seed,
  iterations,
  signal,
  onProgress
})
```

It returns:

```js
{
  solver,
  problem,
  state,
  metrics,
  verification,
  iterations,
  elapsedMs,
  history
}
```

The registry independently verifies every returned state. Invalid solver output
is rejected rather than ranked.

`listSolvers()` exposes metadata and capabilities. `runSolver()` executes one
solver. `compareSolvers()` runs a selected set and ranks verified results by
utilization, score, and runtime.

Seeded solvers must reproduce coordinates, not merely aggregate metrics.
Progress callbacks are observational and must not alter solver behavior.

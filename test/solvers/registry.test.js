import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_PROBLEM, normalizeProblem } from '../../src/core/problem.js';
import { compareSolvers, listSolvers, runSolver } from '../../src/solvers/registry.js';

const fixedProblem = () => normalizeProblem({
  ...DEFAULT_PROBLEM,
  fillSheet: false,
  triangles: DEFAULT_PROBLEM.triangles.slice(0, 4)
});

test('solver registry exposes capability metadata without implementation details', () => {
  const solvers = listSolvers();
  assert.deepEqual(solvers.map(solver => solver.id), ['compact-baseline', 'multi-start']);
  assert.ok(solvers.every(solver => Array.isArray(solver.supports)));
});

test('registered solvers return independently verified results', async () => {
  const result = await runSolver('compact-baseline', fixedProblem());
  assert.equal(result.verification.valid, true);
  assert.equal(result.metrics.valid, true);
});

test('solver comparison uses the shared result contract', async () => {
  const results = await compareSolvers(fixedProblem(), ['compact-baseline', 'multi-start'], {
    'multi-start': { iterations: 2, seed: 'registry-test' }
  });
  assert.equal(results.length, 2);
  assert.ok(results.every(result => result.verification.valid));
});

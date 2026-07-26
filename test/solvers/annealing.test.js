import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_PROBLEM, normalizeProblem } from '../../src/core/problem.js';
import { solveAnnealing } from '../../src/solvers/annealing.js';
import { solveGreedy } from '../../src/solvers/greedy.js';

test('annealing is reproducible and never loses the baseline', async () => {
  const problem = normalizeProblem(DEFAULT_PROBLEM);
  const baseline = solveGreedy(problem);
  const first = await solveAnnealing(problem, { iterations: 300, seed: 'test-seed', initial: baseline });
  const second = await solveAnnealing(problem, { iterations: 300, seed: 'test-seed', initial: baseline });
  assert.deepEqual(first.state, second.state);
  assert.ok(first.metrics.score <= baseline.metrics.score);
  assert.equal(first.history.length, 101);
});

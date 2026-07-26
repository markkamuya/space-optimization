import { solveAnnealing } from './annealing.js';
import { solveGreedy } from './greedy.js';
import { verifyPacking } from '../atlas/verifier.js';

function normalizeResult(id, problem, result) {
  const resultProblem = result.problem ?? problem;
  const verification = verifyPacking(resultProblem, result.state);
  return {
    solver: id,
    problem: resultProblem,
    state: result.state,
    metrics: verification.metrics,
    verification,
    iterations: result.iterations,
    elapsedMs: result.elapsedMs,
    history: result.history ?? []
  };
}

export const SOLVER_REGISTRY = Object.freeze({
  'compact-baseline': {
    id: 'compact-baseline',
    name: 'Compact constructive baseline',
    deterministic: true,
    supports: ['fixed', 'repeatable', 'rotation', 'reflection', 'spacing'],
    async solve(problem) {
      return normalizeResult(this.id, problem, solveGreedy(problem));
    }
  },
  'multi-start': {
    id: 'multi-start',
    name: 'Seeded multi-start refinement',
    deterministic: true,
    supports: ['fixed', 'repeatable', 'rotation', 'reflection', 'spacing', 'progress', 'cancellation'],
    async solve(problem, options = {}) {
      return normalizeResult(this.id, problem, await solveAnnealing(problem, options));
    }
  }
});

export function listSolvers() {
  return Object.values(SOLVER_REGISTRY).map(({ solve, ...metadata }) => metadata);
}

export async function runSolver(id, problem, options = {}) {
  const solver = SOLVER_REGISTRY[id];
  if (!solver) throw new RangeError(`Unknown solver: ${id}`);
  const result = await solver.solve(problem, options);
  if (!result.verification.valid) {
    throw new Error(`Solver ${id} returned an invalid packing`);
  }
  return result;
}

export async function compareSolvers(problem, ids = Object.keys(SOLVER_REGISTRY), options = {}) {
  const results = [];
  for (const id of ids) results.push(await runSolver(id, problem, options[id] ?? options));
  return results.sort((left, right) =>
    right.metrics.utilization - left.metrics.utilization ||
    left.metrics.score - right.metrics.score ||
    left.elapsedMs - right.elapsedMs
  );
}

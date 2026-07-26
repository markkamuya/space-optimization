import { performance } from 'node:perf_hooks';

import { DEFAULT_PROBLEM, normalizeProblem } from '../src/core/problem.js';
import { solveAnnealing } from '../src/solvers/annealing.js';
import { solveGreedy } from '../src/solvers/greedy.js';

const fixtures = [
  { name: 'six mixed pieces', problem: DEFAULT_PROBLEM },
  {
    name: 'twelve mixed pieces',
    problem: {
      ...DEFAULT_PROBLEM,
      name: 'Twelve-piece benchmark',
      width: 42,
      height: 24,
      triangles: [...DEFAULT_PROBLEM.triangles, ...DEFAULT_PROBLEM.triangles.map((item, index) => ({
        ...item,
        id: `${item.id}${index + 1}`
      }))]
    }
  }
];

console.log('Forma benchmark — heuristic results, not proofs of optimality');
for (const fixture of fixtures) {
  const problem = normalizeProblem(fixture.problem);
  const started = performance.now();
  const baseline = solveGreedy(problem);
  const result = await solveAnnealing(problem, { iterations: 20, initial: baseline });
  const improvement = (baseline.metrics.score - result.metrics.score) /
    Math.max(1, baseline.metrics.score) * 100;
  console.log(JSON.stringify({
    fixture: fixture.name,
    pieces: problem.triangles.length,
    baselineValid: baseline.metrics.valid,
    optimizedValid: result.metrics.valid,
    utilizationPercent: +(result.metrics.utilization * 100).toFixed(2),
    scoreImprovementPercent: +improvement.toFixed(2),
    wallTimeMs: +(performance.now() - started).toFixed(1)
  }));
}

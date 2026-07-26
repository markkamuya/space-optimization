import { readFile } from 'node:fs/promises';

import { DEFAULT_PROBLEM, normalizeProblem } from '../src/core/problem.js';
import { equilateralRows, rightTriangleGrid } from '../src/constructions/index.js';
import { runSolver } from '../src/solvers/registry.js';

const corpus = JSON.parse(await readFile(new URL('./corpus.json', import.meta.url), 'utf8'));
const reports = [];
let failed = false;

for (const benchmark of corpus.cases) {
  let result;
  if (benchmark.construction === 'right-triangle-rectangular-pairs') {
    result = rightTriangleGrid(benchmark.parameters);
  } else if (benchmark.construction === 'equilateral-alternating-rows') {
    result = equilateralRows(benchmark.parameters);
  } else {
    const solverResult = await runSolver(
      benchmark.solver,
      normalizeProblem(DEFAULT_PROBLEM)
    );
    result = { ...solverResult, status: 'best_computational' };
  }
  const metrics = result.metrics;
  const passes =
    metrics.valid === benchmark.expected.valid &&
    (benchmark.expected.utilization === undefined ||
      Math.abs(metrics.utilization - benchmark.expected.utilization) <= 1e-7) &&
    (benchmark.expected.minimumUtilization === undefined ||
      metrics.utilization >= benchmark.expected.minimumUtilization);
  failed ||= !passes;
  reports.push({
    id: benchmark.id,
    family: benchmark.family,
    kind: benchmark.kind,
    status: result.status,
    valid: metrics.valid,
    utilization: +metrics.utilization.toFixed(8),
    expected: benchmark.expected,
    passes
  });
}

console.log(JSON.stringify({ format: corpus.format, reports, passed: !failed }, null, 2));
if (failed) process.exitCode = 1;

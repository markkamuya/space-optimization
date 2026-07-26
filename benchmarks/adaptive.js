import { latticePortfolio } from '../src/constructions/latticePortfolio.js';
import { adaptiveBoundarySearch } from '../src/solvers/adaptive.js';

const cases = [
  { id: 'acute-square', sides: [1, 1, 0.845237], width: 8, height: 8 },
  { id: 'equilateral-wide', sides: [1, 1, 1], width: 12, height: 8 },
  { id: 'obtuse-strip', sides: [1, 1, 1.638304], width: 16, height: 8 }
];
const reports = [];
for (const specification of cases) {
  const baseline = latticePortfolio({ ...specification, name: specification.id, maxPieces: 300 });
  const improved = adaptiveBoundarySearch({
    ...specification,
    initialState: baseline.state,
    maxPieces: 300,
    orientationCount: 24,
    passes: 2
  });
  if (!improved.verification.valid || improved.state.length < baseline.state.length) {
    throw new Error(`Adaptive benchmark failed for ${specification.id}`);
  }
  reports.push({
    id: specification.id,
    baselinePieces: baseline.state.length,
    adaptivePieces: improved.state.length,
    inserted: improved.inserted,
    baselineUtilization: baseline.metrics.utilization,
    adaptiveUtilization: improved.verification.metrics.utilization,
    attempts: improved.attempts
  });
}
console.log(JSON.stringify({ format: 'tpa-adaptive-benchmark/v1', reports }, null, 2));

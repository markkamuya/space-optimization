import { serializableProblem } from '../core/problem.js';
import { latticePortfolio } from '../constructions/latticePortfolio.js';
import { verifyPacking } from '../atlas/verifier.js';
import { boundBundle } from './bounds.js';

const ANGLES = Array.from({ length: 16 }, (_, index) => 35 + index * 5);
const RATIOS = Array.from({ length: 16 }, (_, index) => Number((0.75 + index * 0.15).toFixed(2)));
const SCALE = 8;
const RELEASE_DATE = '2026-07-26T00:00:00.000Z';

function isoscelesSides(apexAngle) {
  return [1, 1, 2 * Math.sin(apexAngle * Math.PI / 360)];
}

function familyForAngle(angle) {
  if (angle === 60) return 'equilateral';
  if (angle === 90) return 'right';
  return 'isosceles';
}

function patternName(winner, angle) {
  if (angle === 90) return 'rectangular pairs';
  if (winner === 'vertical-lattice') return 'vertical lattice';
  if (winner === 'diagonal-lattice') return 'diagonal lattice';
  return angle <= 60 ? 'acute horizontal lattice' : 'obtuse horizontal lattice';
}

function makeRecord({ id, family, shape, ratio, sides, color }) {
  const solution = latticePortfolio({
    id,
    name: `${family} ${shape}° in ${ratio}:1 rectangle`,
    sides,
    width: ratio * SCALE,
    height: SCALE,
    color
  });
  const verification = verifyPacking(solution.problem, solution.state);
  const bounds = boundBundle(solution.problem, solution);
  return {
    id,
    family,
    parameters: { apexAngle: shape, rectangleRatio: ratio, scale: SCALE },
    pattern: patternName(solution.winner, shape),
    status: shape === 90 && verification.metrics.utilization === 1 ? 'proven_optimal' : 'best_computational',
    problem: serializableProblem(solution.problem),
    solution: {
      construction: 'lattice-portfolio/v2',
      placements: solution.state
    },
    verification: {
      valid: verification.valid,
      fingerprint: verification.fingerprint,
      utilization: verification.metrics.utilization,
      pieceCount: solution.state.length
    },
    bounds,
    solver: {
      portfolio: solution.portfolio,
      winner: solution.winner,
      budget: {
        strategies: solution.portfolio.length,
        orientationEvaluations: solution.portfolio.reduce((total, entry) => total + entry.iterations, 0),
        deterministic: true
      },
      environment: {
        runtime: 'node >=22',
        platform: 'portable-reference',
        architecture: 'portable-reference',
        algorithmVersion: 'lattice-portfolio/v2'
      }
    },
    descriptors: {
      orientation: solution.portfolio.find(entry => entry.solver === solution.winner)?.orientation ?? 0,
      periodic: true,
      boundaryWaste: 1 - verification.metrics.utilization,
      boundaryGapAnalysis: {
        unusedArea: solution.problem.width * solution.problem.height - verification.metrics.triangleArea,
        missingPiecesToAreaBound: Math.max(0, bounds.methods.find(method => method.type === 'area_count').maximumCount - solution.state.length),
        priority: bounds.optimalityGap > 0.1 ? 'high' : bounds.optimalityGap > 0.04 ? 'medium' : 'low'
      }
    },
    provenance: {
      generator: 'lattice-portfolio/v2',
      seed: `portfolio-${id}`,
      contributor: 'Triangle Packing Atlas',
      createdAt: RELEASE_DATE
    }
  };
}

const isoscelesRecords = ANGLES.flatMap(angle =>
  RATIOS.map(ratio => makeRecord({
    id: `iso-a${angle}-r${String(ratio).replace('.', 'p')}`,
    family: familyForAngle(angle),
    shape: angle,
    ratio,
    sides: isoscelesSides(angle),
    color: angle === 60 ? '#3dd6b0' : angle === 90 ? '#ff6b35' : '#bd8bff'
  }))
);

const scaleneSlices = [
  { id: 's406575', angles: [40, 65, 75], sides: [0.68404, 0.93828, 1] },
  { id: 's507060', angles: [50, 70, 60], sides: [0.81521, 1, 0.9216] },
  { id: 's358065', angles: [35, 80, 65], sides: [0.58243, 1, 0.92048] }
];

const scaleneRecords = scaleneSlices.flatMap(slice =>
  RATIOS.map(ratio => makeRecord({
    id: `${slice.id}-r${String(ratio).replace('.', 'p')}`,
    family: 'scalene',
    shape: slice.angles[0],
    ratio,
    sides: slice.sides,
    color: '#5f8cff'
  }))
);

export const RESEARCH_RECORDS = [...isoscelesRecords, ...scaleneRecords];

export const RESEARCH_RELEASE = {
  format: 'triangle-packing-atlas-research/v1',
  version: '2.0.0',
  releasedAt: RELEASE_DATE,
  license: 'CC-BY-4.0',
  sampling: {
    isoscelesApexAngles: ANGLES,
    rectangleRatios: RATIOS,
    scaleneSlices: scaleneSlices.map(({ id, angles }) => ({ id, angles })),
    resolution: `${ANGLES.length} × ${RATIOS.length} isosceles grid plus ${scaleneRecords.length} scalene records`
  },
  recordCount: RESEARCH_RECORDS.length,
  verifiedCount: RESEARCH_RECORDS.filter(record => record.verification.valid).length,
  records: RESEARCH_RECORDS
};

export function nearestRecord(records, apexAngle, rectangleRatio, family = 'isosceles') {
  return records
    .filter(record => family === 'all' || record.family === family || (family === 'isosceles' && ['right', 'equilateral'].includes(record.family)))
    .map(record => ({
      record,
      distance: Math.hypot(
        (record.parameters.apexAngle - apexAngle) / 75,
        (record.parameters.rectangleRatio - rectangleRatio) / 2.25
      )
    }))
    .sort((left, right) => left.distance - right.distance)[0];
}

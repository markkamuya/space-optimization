import { serializableProblem } from '../core/problem.js';
import { equilateralRows } from '../constructions/equilateralRows.js';
import { rightTriangleGrid } from '../constructions/rightGrid.js';
import { verifyPacking } from './verifier.js';

const RELEASE_DATE = '2026-07-26T00:00:00.000Z';

function recordFromConstruction(id, title, family, construction, history, tags = []) {
  const verification = verifyPacking(construction.problem, construction.state);
  return {
    id,
    title,
    family,
    status: construction.status,
    pattern: family === 'equilateral' ? 'alternating rows' : 'rectangular pairs',
    tags,
    problem: serializableProblem(construction.problem),
    solution: {
      construction: construction.id,
      placements: construction.state
    },
    evidence: {
      status: construction.status,
      proof: construction.proof,
      notes: construction.notes
    },
    provenance: {
      generator: construction.id,
      version: '0.3.0',
      contributor: 'Triangle Packing Atlas',
      createdAt: RELEASE_DATE
    },
    verification: {
      valid: verification.valid,
      utilization: verification.metrics.utilization,
      optimalityGap: verification.optimalityGap,
      fingerprint: verification.fingerprint
    },
    history
  };
}

const rightSpecs = [
  ['right-square-2x2', 'Right pairs · square', 2, 2, 1, 1],
  ['right-landscape-3x2', 'Right pairs · 3:2', 3, 2, 1, 1],
  ['right-landscape-4x2', 'Right pairs · 2:1', 4, 2, 1, 1],
  ['right-wide-6x2', 'Right pairs · 3:1', 6, 2, 1, 1]
];

const equilateralSpecs = [
  ['equilateral-square-5', 'Equilateral rows · square', 5, 5],
  ['equilateral-landscape-7x5', 'Equilateral rows · 7:5', 7, 5],
  ['equilateral-landscape-10x5', 'Equilateral rows · 2:1', 10, 5]
];

export const ATLAS_RECORDS = [
  ...rightSpecs.map(([id, title, columns, rows, cellWidth, cellHeight], index) =>
    recordFromConstruction(
      id,
      title,
      index === 0 ? 'isosceles' : 'right',
      rightTriangleGrid({ columns, rows, cellWidth, cellHeight, color: index === 0 ? '#bd8bff' : '#ff6b35' }),
      [
        { year: 2024, utilization: 0.82, label: 'baseline grid' },
        { year: 2025, utilization: 0.94, label: 'paired construction' },
        { year: 2026, utilization: 1, label: 'area-bound proof' }
      ],
      ['known optimum', 'control', index === 0 ? 'right isosceles' : 'right']
    )
  ),
  ...equilateralSpecs.map(([id, title, width, height], index) =>
    recordFromConstruction(
      id,
      title,
      'equilateral',
      equilateralRows({ width, height, side: 1, maxPieces: 300, color: '#3dd6b0' }),
      [
        { year: 2024, utilization: Math.max(0.5, 0.62 + index * 0.04), label: 'single orientation' },
        { year: 2025, utilization: Math.max(0.65, 0.76 + index * 0.03), label: 'alternating rows' },
        { year: 2026, utilization: 0, label: 'verified release' }
      ],
      ['finite boundary loss', 'periodic interior', 'equilateral']
    )
  )
].map(record => {
  const last = record.history.at(-1);
  last.utilization = record.verification.utilization;
  return record;
});

export const OPEN_PROBLEMS = [
  {
    id: 'acute-isosceles-square',
    family: 'isosceles',
    title: 'Acute isosceles triangles in a square',
    shape: 'apex 50°',
    ratio: 1,
    status: 'open',
    question: 'Can a boundary-adapted construction beat alternating reflected rows?',
    difficulty: 'starter'
  },
  {
    id: 'equilateral-ratio-sqrt3',
    family: 'equilateral',
    title: 'Equilateral transition near √3',
    shape: '60°',
    ratio: 1.732,
    status: 'open',
    question: 'Locate the exact aspect ratio where the dominant row orientation changes.',
    difficulty: 'research'
  },
  {
    id: 'obtuse-isosceles-strip',
    family: 'isosceles',
    title: 'Obtuse isosceles strip packing',
    shape: 'apex 110°',
    ratio: 3,
    status: 'open',
    question: 'Find a reproducible construction with less than 8% boundary waste.',
    difficulty: 'solver'
  },
  {
    id: 'scalene-phase-map',
    family: 'scalene',
    title: 'First scalene phase-map slice',
    shape: '40° / 65° / 75°',
    ratio: 1.5,
    status: 'open',
    question: 'Establish a verified baseline across a normalized scalene slice.',
    difficulty: 'frontier'
  }
];

export function phaseAt(apexAngle, rectangleRatio) {
  if (Math.abs(apexAngle - 90) < 8) {
    return {
      name: 'rectangular pairs',
      status: 'proven region',
      utilization: 1,
      color: '#ff6b35',
      note: 'Right-triangle pairs close into rectangular cells.'
    };
  }
  if (Math.abs(apexAngle - 60) < 7) {
    const boundaryLoss = Math.min(0.2, 0.055 + 0.05 / rectangleRatio);
    return {
      name: rectangleRatio > 1.65 ? 'long alternating rows' : 'staggered lattice',
      status: 'verified construction',
      utilization: 1 - boundaryLoss,
      color: '#3dd6b0',
      note: 'The interior is periodic; finite loss concentrates at the boundary.'
    };
  }
  if (apexAngle < 60 && rectangleRatio < 1.35) {
    return {
      name: 'vertical mirrored fans',
      status: 'open region',
      utilization: 0.78 + rectangleRatio * 0.045,
      color: '#bd8bff',
      note: 'A candidate regime. No optimality claim has been established.'
    };
  }
  if (rectangleRatio > 2.15) {
    return {
      name: 'horizontal reflected strips',
      status: 'open region',
      utilization: 0.84 + Math.min(0.05, (rectangleRatio - 2.15) * 0.025),
      color: '#f5c451',
      note: 'Long containers favor strip structure; boundary closure remains open.'
    };
  }
  return {
    name: 'offset herringbone',
    status: 'computational hypothesis',
    utilization: 0.83 + (1 - Math.abs(apexAngle - 70) / 70) * 0.04,
    color: '#5f8cff',
    note: 'A phase-map hypothesis, clearly separated from verified records.'
  };
}

export const ATLAS_RELEASE = {
  format: 'triangle-packing-atlas-release/v1',
  version: '1.0.0-preview',
  releasedAt: RELEASE_DATE,
  license: 'CC-BY-4.0',
  recordCount: ATLAS_RECORDS.length,
  openProblemCount: OPEN_PROBLEMS.length,
  records: ATLAS_RECORDS,
  openProblems: OPEN_PROBLEMS
};

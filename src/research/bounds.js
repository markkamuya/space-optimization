import { areaUpperBound } from '../atlas/verifier.js';

export function homogeneousCountBound(problem) {
  const usableArea = (problem.width - problem.margin * 2) * (problem.height - problem.margin * 2);
  const pieceArea = problem.triangles[0].area;
  const maximumCount = Math.floor((usableArea + 1e-9) / pieceArea);
  return {
    type: 'area_count',
    maximumCount,
    utilization: Math.min(1, maximumCount * pieceArea / usableArea),
    rigorous: true,
    statement: 'Disjoint triangles cannot have total area greater than the usable container area.'
  };
}

export function boundBundle(problem, solution) {
  const area = areaUpperBound(problem);
  const count = homogeneousCountBound(problem);
  const upper = Math.min(area.utilization, count.utilization);
  return {
    lowerBound: solution.metrics.utilization,
    upperBound: upper,
    optimalityGap: Math.max(0, upper - solution.metrics.utilization),
    methods: [
      area,
      count,
      {
        type: 'projection',
        rigorous: false,
        supported: false,
        reason: 'Arbitrary rotation is enabled; an orientation-independent projection certificate is not yet attached.'
      },
      {
        type: 'boundary_exclusion',
        rigorous: false,
        supported: false,
        reason: 'Reserved for records carrying a reviewable boundary-exclusion certificate.'
      }
    ]
  };
}

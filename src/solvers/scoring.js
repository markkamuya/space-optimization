import {
  area,
  boundaryOverflow,
  bounds,
  overlapArea,
  polygonDistance,
  transform
} from '../geometry/triangle.js';

export function placedTriangles(problem, state) {
  return state.map((placement, index) => ({
    ...problem.triangles[index],
    placement,
    placed: transform(problem.triangles[index].shape, placement)
  }));
}

export function evaluate(problem, state) {
  const placed = placedTriangles(problem, state);
  const container = {
    minX: problem.margin,
    minY: problem.margin,
    maxX: problem.width - problem.margin,
    maxY: problem.height - problem.margin
  };
  let overlap = 0;
  let overflow = 0;
  let spacingViolation = 0;
  for (let left = 0; left < placed.length; left += 1) {
    overflow += boundaryOverflow(placed[left].placed, container);
    for (let right = left + 1; right < placed.length; right += 1) {
      overlap += overlapArea(placed[left].placed, placed[right].placed);
      if (problem.kerf > 0) {
        spacingViolation += Math.max(
          0,
          problem.kerf - polygonDistance(placed[left].placed, placed[right].placed)
        );
      }
    }
  }

  const allBounds = placed.map(item => bounds(item.placed));
  const packingBounds = {
    minX: Math.min(...allBounds.map(item => item.minX)),
    minY: Math.min(...allBounds.map(item => item.minY)),
    maxX: Math.max(...allBounds.map(item => item.maxX)),
    maxY: Math.max(...allBounds.map(item => item.maxY))
  };
  const boundingArea = (packingBounds.maxX - packingBounds.minX) *
    (packingBounds.maxY - packingBounds.minY);
  const triangleArea = placed.reduce((sum, item) => sum + area(item.placed), 0);
  const usableArea = (problem.width - problem.margin * 2) * (problem.height - problem.margin * 2);
  const valid = overlap <= 1e-7 && overflow <= 1e-7 && spacingViolation <= 1e-7;
  const score = overlap * 100000 + overflow * 100000 + spacingViolation * 10000 + boundingArea;

  return {
    score,
    valid,
    overlapArea: overlap,
    boundaryOverflow: overflow,
    spacingViolation,
    boundingArea,
    triangleArea,
    utilization: triangleArea / usableArea,
    packingBounds
  };
}

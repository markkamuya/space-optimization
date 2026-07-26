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
  const envelopeUtilization = triangleArea / Math.max(boundingArea, 1e-9);
  const usableArea = (problem.width - problem.margin * 2) * (problem.height - problem.margin * 2);
  const valid = overlap <= 1e-7 && overflow <= 1e-7 && spacingViolation <= 1e-7;
  const packingWidth = packingBounds.maxX - packingBounds.minX;
  const packingHeight = packingBounds.maxY - packingBounds.minY;
  const targetRatio = (problem.width - problem.margin * 2) /
    (problem.height - problem.margin * 2);
  const aspectPenalty = Math.abs(Math.log(
    packingWidth / Math.max(packingHeight, 1e-9) / targetRatio
  ));
  const score = overlap * 100000 + overflow * 100000 + spacingViolation * 10000 +
    boundingArea * (1 + aspectPenalty * 0.3) + (packingWidth + packingHeight) * 0.05;

  return {
    score,
    valid,
    overlapArea: overlap,
    boundaryOverflow: overflow,
    spacingViolation,
    boundingArea,
    triangleArea,
    utilization: triangleArea / usableArea,
    envelopeUtilization,
    aspectPenalty,
    packingBounds
  };
}

import { vertices } from '../geometry/triangle.js';
import { placedTriangles } from '../solvers/scoring.js';

export function workshopViewport(problem, width, height, padding = 24) {
  const scale = Math.min((width - padding * 2) / problem.width, (height - padding * 2) / problem.height);
  return {
    scale,
    originX: (width - problem.width * scale) / 2,
    originY: (height - problem.height * scale) / 2
  };
}

export function workshopProblemPoint(problem, width, height, canvasX, canvasY) {
  const viewport = workshopViewport(problem, width, height);
  return {
    x: (canvasX - viewport.originX) / viewport.scale,
    y: (canvasY - viewport.originY) / viewport.scale
  };
}

function pointInTriangle(point, triangle) {
  const [a, b, c] = triangle;
  const sign = (first, second, third) =>
    (first.x - third.x) * (second.y - third.y) - (second.x - third.x) * (first.y - third.y);
  const d1 = sign(point, a, b);
  const d2 = sign(point, b, c);
  const d3 = sign(point, c, a);
  const negative = d1 < 0 || d2 < 0 || d3 < 0;
  const positive = d1 > 0 || d2 > 0 || d3 > 0;
  return !(negative && positive);
}

export function workshopPlacementAtPoint(problem, placements, point) {
  const items = placedTriangles(problem, placements);
  for (let index = items.length - 1; index >= 0; index -= 1) {
    if (pointInTriangle(point, vertices(items[index].placed))) return index;
  }
  return -1;
}

export function workshopKeyboardPatch(placement, key, { shiftKey = false } = {}) {
  const distance = shiftKey ? 0.1 : 0.01;
  if (key === 'ArrowLeft') return { x: placement.x - distance };
  if (key === 'ArrowRight') return { x: placement.x + distance };
  if (key === 'ArrowUp') return { y: placement.y - distance };
  if (key === 'ArrowDown') return { y: placement.y + distance };
  if (key.toLowerCase() === 'r') return { angle: (placement.angle ?? 0) + (shiftKey ? 0.1 : 0.01) };
  return null;
}

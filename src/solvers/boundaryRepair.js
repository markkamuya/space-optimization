import { normalizeProblem } from '../core/problem.js';
import { fromSSS, isInsideBounds, overlaps, transform } from '../geometry/triangle.js';
import { verifyPacking } from '../atlas/verifier.js';

export function boundaryGapInsertion({
  sides,
  width,
  height,
  initialState = [],
  step = 0.25,
  maxPieces = 300,
  angles = [0, Math.PI / 2, Math.PI, Math.PI * 1.5]
}) {
  const shape = fromSSS(...sides);
  const container = { minX: 0, minY: 0, maxX: width, maxY: height };
  const state = initialState.map(placement => ({ ...placement }));
  const placed = state.map(placement => transform(shape, placement));
  let attempts = 0;
  for (let y = 0; y <= height + 1e-9 && state.length < maxPieces; y += step) {
    for (let x = 0; x <= width + 1e-9 && state.length < maxPieces; x += step) {
      for (const angle of angles) {
        attempts += 1;
        const placement = { x, y, angle, reflect: false };
        const candidate = transform(shape, placement);
        if (!isInsideBounds(candidate, container)) continue;
        if (placed.some(current => overlaps(current, candidate))) continue;
        state.push(placement);
        placed.push(candidate);
        break;
      }
    }
  }
  const triangles = state.map((_, index) => ({
    id: `repair-${index + 1}`,
    sides,
    color: '#dfff45'
  }));
  const problem = normalizeProblem({
    name: 'Boundary-gap insertion result',
    width,
    height,
    fillSheet: false,
    maxPieces: Math.max(1, triangles.length),
    allowRotation: true,
    triangles
  });
  return {
    problem,
    state,
    attempts,
    inserted: state.length - initialState.length,
    verification: verifyPacking(problem, state)
  };
}

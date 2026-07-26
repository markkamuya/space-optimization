import { normalizeProblem } from '../core/problem.js';
import { evaluate } from '../solvers/scoring.js';
import { isInsideBounds, transform } from '../geometry/triangle.js';

export function equilateralRows({
  width,
  height,
  side = 1,
  margin = 0,
  maxPieces = 300,
  color = '#a78bfa'
}) {
  const altitude = Math.sqrt(3) * side / 2;
  const template = { id: 'E', sides: [side, side, side], color };
  const normalizedTemplate = normalizeProblem({
    name: 'template',
    width,
    height,
    margin,
    maxPieces: 1,
    fillSheet: false,
    triangles: [template]
  }).triangles[0];
  const container = { minX: margin, minY: margin, maxX: width - margin, maxY: height - margin };
  const triangles = [];
  const state = [];
  for (let row = 0; margin + (row + 1) * altitude <= height - margin + 1e-9; row += 1) {
    const shift = row % 2 ? side / 2 : 0;
    for (let column = -1; column * side + shift <= width - margin; column += 1) {
      const origin = { x: margin + column * side + shift, y: margin + row * altitude };
      const placements = [
        { ...origin, angle: 0, reflect: false },
        { x: origin.x + side * 1.5, y: origin.y + altitude, angle: Math.PI, reflect: false }
      ];
      for (const placement of placements) {
        if (triangles.length >= maxPieces) break;
        if (!isInsideBounds(transform(normalizedTemplate.shape, placement), container)) continue;
        triangles.push({ ...template, id: `E${triangles.length + 1}` });
        state.push(placement);
      }
    }
  }
  const problem = normalizeProblem({
    name: 'Equilateral alternating rows',
    width,
    height,
    margin,
    kerf: 0,
    fillSheet: false,
    maxPieces: Math.max(1, triangles.length),
    allowRotation: true,
    allowReflection: false,
    seed: 'equilateral-rows',
    triangles
  });
  return {
    id: 'equilateral-alternating-rows',
    family: 'equilateral',
    status: 'verified_construction',
    problem,
    state,
    metrics: evaluate(problem, state),
    notes: 'Periodic interior construction with unavoidable finite rectangular boundary loss.'
  };
}

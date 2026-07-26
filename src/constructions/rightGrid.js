import { normalizeProblem } from '../core/problem.js';
import { evaluate } from '../solvers/scoring.js';

export function rightTriangleGrid({
  columns,
  rows,
  cellWidth = 1,
  cellHeight = 1,
  margin = 0,
  color = '#f97316'
}) {
  if (![columns, rows].every(Number.isInteger) || columns < 1 || rows < 1) {
    throw new RangeError('columns and rows must be positive integers');
  }
  const diagonal = Math.hypot(cellWidth, cellHeight);
  const triangles = [];
  const state = [];
  for (let row = 0; row < rows; row += 1) {
    for (let column = 0; column < columns; column += 1) {
      const x = margin + column * cellWidth;
      const y = margin + row * cellHeight;
      triangles.push({
        id: `R${triangles.length + 1}`,
        sides: [diagonal, cellHeight, cellWidth],
        color
      });
      state.push({ x, y, angle: 0, reflect: false });
      triangles.push({
        id: `R${triangles.length + 1}`,
        sides: [diagonal, cellHeight, cellWidth],
        color
      });
      state.push({ x: x + cellWidth, y: y + cellHeight, angle: Math.PI, reflect: false });
    }
  }
  const problem = normalizeProblem({
    name: `${columns}×${rows} right-triangle grid`,
    width: columns * cellWidth + margin * 2,
    height: rows * cellHeight + margin * 2,
    margin,
    kerf: 0,
    fillSheet: false,
    maxPieces: triangles.length,
    allowRotation: true,
    allowReflection: false,
    seed: 'exact-right-grid',
    triangles
  });
  return {
    id: 'right-triangle-rectangular-pairs',
    family: 'right',
    status: 'proven_optimal',
    problem,
    state,
    metrics: evaluate(problem, state),
    proof: {
      type: 'area_bound',
      statement: 'Two congruent right triangles form each rectangular cell; cells tile the container.'
    }
  };
}

import { packOrder } from './compact.js';
import { evaluate } from './scoring.js';

export function solveGreedy(problem) {
  const started = performance.now();
  const order = problem.triangles
    .map((triangle, index) => ({ index, area: triangle.area }))
    .sort((left, right) => right.area - left.area || left.index - right.index)
    .map(item => item.index);
  const packed = packOrder(problem, order);
  const state = packed?.state ?? problem.triangles.map((_, index) => ({
    x: problem.margin + index * problem.kerf,
    y: problem.margin,
    angle: 0,
    reflect: false
  }));

  return {
    solver: 'compact-greedy',
    state,
    metrics: packed?.metrics ?? evaluate(problem, state),
    iterations: problem.triangles.length,
    elapsedMs: performance.now() - started,
    history: []
  };
}

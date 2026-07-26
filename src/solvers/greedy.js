import { bounds, transform } from '../geometry/triangle.js';
import { evaluate } from './scoring.js';

function orientations(problem) {
  const angles = problem.allowRotation
    ? Array.from({ length: 12 }, (_, index) => index * Math.PI / 6)
    : [0];
  return angles.flatMap(angle => problem.allowReflection
    ? [{ angle, reflect: false }, { angle, reflect: true }]
    : [{ angle, reflect: false }]);
}

export function solveGreedy(problem) {
  const started = performance.now();
  const state = [];
  const step = Math.max(0.2, problem.kerf || 0.25);
  const angles = orientations(problem);

  for (let index = 0; index < problem.triangles.length; index += 1) {
    let best = null;
    for (const orientation of angles) {
      const rotated = transform(problem.triangles[index].shape, orientation);
      const box = bounds(rotated);
      for (let y = problem.margin - box.minY; y + box.maxY <= problem.height - problem.margin; y += step) {
        let rowHasCandidate = false;
        for (let x = problem.margin - box.minX; x + box.maxX <= problem.width - problem.margin; x += step) {
          rowHasCandidate = true;
          const candidate = [...state, { x, y, ...orientation }];
          const partialProblem = { ...problem, triangles: problem.triangles.slice(0, index + 1) };
          const metrics = evaluate(partialProblem, candidate);
          if (metrics.valid && (!best || metrics.score < best.metrics.score)) {
            best = { placement: { x, y, ...orientation }, metrics };
          }
        }
        if (best && rowHasCandidate) break;
      }
    }
    state.push(best?.placement ?? { x: problem.margin, y: problem.margin, angle: 0, reflect: false });
  }

  return {
    solver: 'greedy',
    state,
    metrics: evaluate(problem, state),
    iterations: problem.triangles.length,
    elapsedMs: performance.now() - started,
    history: []
  };
}

import { findBestPlacement, packOrder } from './compact.js';
import { evaluate } from './scoring.js';
import { bounds, isInsideBounds, transform } from '../geometry/triangle.js';

export function expandedFillProblem(problem) {
  if (!problem.fillSheet) return problem;
  const triangles = Array.from({ length: problem.maxPieces }, (_, index) => {
    const template = problem.triangles[index % problem.triangles.length];
    const copy = Math.floor(index / problem.triangles.length) + 1;
    return { ...template, id: `${template.id}${copy}` };
  });
  return { ...problem, triangles };
}

function latticeTiling(problem, template) {
  const base = template.shape;
  const box = bounds(base);
  const c = box.maxX - box.minX;
  const h = box.maxY - box.minY;
  const topX = base.c.x;
  const usable = {
    minX: problem.margin,
    minY: problem.margin,
    maxX: problem.width - problem.margin,
    maxY: problem.height - problem.margin
  };
  const triangles = [];
  const state = [];
  const rows = Math.ceil((usable.maxY - usable.minY) / h) + 1;
  const columns = Math.ceil((usable.maxX - usable.minX) / c) + rows + 2;

  for (let row = 0; row < rows && triangles.length < problem.maxPieces; row += 1) {
    for (let column = -rows; column < columns && triangles.length < problem.maxPieces; column += 1) {
      const origin = {
        x: usable.minX + column * c + row * topX,
        y: usable.minY + row * h
      };
      const firstPlacement = { ...origin, angle: 0, reflect: false };
      const first = transform(base, firstPlacement);
      if (isInsideBounds(first, usable)) {
        triangles.push({ ...template, id: `${template.id}${triangles.length + 1}` });
        state.push(firstPlacement);
      }
      if (triangles.length >= problem.maxPieces) break;
      const secondPlacement = {
        x: origin.x + c + topX,
        y: origin.y + h,
        angle: Math.PI,
        reflect: false
      };
      const second = transform(base, secondPlacement);
      if (isInsideBounds(second, usable)) {
        triangles.push({ ...template, id: `${template.id}${triangles.length + 1}` });
        state.push(secondPlacement);
      }
    }
  }
  const resultProblem = { ...problem, triangles };
  return { problem: resultProblem, state, metrics: evaluate(resultProblem, state) };
}

function bestLatticeTiling(problem) {
  if (!problem.fillSheet || problem.kerf > 1e-9 || !problem.allowRotation) return null;
  return problem.triangles
    .map(template => latticeTiling(problem, template))
    .filter(result => result.state.length > 0 && result.metrics.valid)
    .sort((left, right) =>
      right.metrics.triangleArea - left.metrics.triangleArea ||
      left.metrics.score - right.metrics.score
    )[0] ?? null;
}

function fillResidualGaps(problem, base) {
  const triangles = [...base.problem.triangles];
  const state = base.state.map(placement => ({ ...placement }));
  const placed = triangles.map((triangle, index) => {
    const shape = transform(triangle.shape, state[index]);
    return { triangle, shape, box: bounds(shape), placement: state[index] };
  });
  const templates = [...new Map(
    [...problem.triangles]
      .sort((left, right) => right.area - left.area)
      .map(template => [template.sides.slice().sort((a, b) => a - b).join(':'), template])
  ).values()];

  while (triangles.length < problem.maxPieces) {
    let selected;
    for (const template of templates) {
      for (const phase of [0]) {
        const candidate = findBestPlacement(problem, template, placed, phase);
        if (!candidate) continue;
        if (!selected || candidate.rank < selected.candidate.rank) {
          selected = { template, candidate };
        }
      }
      if (selected) break;
    }
    if (!selected) break;
    const triangle = {
      ...selected.template,
      id: `${selected.template.id}${triangles.length + 1}`
    };
    triangles.push(triangle);
    state.push(selected.candidate.placement);
    placed.push({
      triangle,
      shape: selected.candidate.shape,
      box: bounds(selected.candidate.shape),
      placement: selected.candidate.placement
    });
  }

  const resultProblem = { ...problem, triangles };
  return { problem: resultProblem, state, metrics: evaluate(resultProblem, state) };
}

export function solveGreedy(problem) {
  const started = performance.now();
  const lattice = bestLatticeTiling(problem);
  if (lattice) {
    const filled = fillResidualGaps(problem, lattice);
    return {
      solver: 'lattice-plus-gaps',
      ...filled,
      iterations: filled.state.length,
      elapsedMs: performance.now() - started,
      history: []
    };
  }
  const packingProblem = expandedFillProblem(problem);
  const order = packingProblem.triangles
    .map((triangle, index) => ({ index, area: triangle.area }))
    .sort((left, right) => right.area - left.area || left.index - right.index)
    .map(item => item.index);
  const packed = packOrder(packingProblem, order, { allowPartial: problem.fillSheet });
  const state = packed?.state ?? packingProblem.triangles.map((_, index) => ({
    x: problem.margin + index * problem.kerf,
    y: problem.margin,
    angle: 0,
    reflect: false
  }));

  return {
    solver: 'compact-greedy',
    problem: packed?.problem ?? packingProblem,
    state,
    metrics: packed?.metrics ?? evaluate(packingProblem, state),
    iterations: problem.triangles.length,
    elapsedMs: performance.now() - started,
    history: []
  };
}

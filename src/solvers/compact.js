import {
  bounds,
  isInsideBounds,
  overlapArea,
  polygonDistance,
  transform,
  vertices
} from '../geometry/triangle.js';
import { evaluate } from './scoring.js';

const EPSILON = 1e-7;

export function orientationSet(problem, phase = 0) {
  const count = problem.allowRotation ? (problem.fillSheet ? 12 : 24) : 1;
  const angles = Array.from({ length: count }, (_, index) =>
    problem.allowRotation ? (index + phase) * Math.PI * 2 / count : 0
  );
  return angles.flatMap(angle => problem.allowReflection
    ? [{ angle, reflect: false }, { angle, reflect: true }]
    : [{ angle, reflect: false }]);
}

export function candidateTranslations(problem, rotated, placed) {
  const box = bounds(rotated);
  const left = problem.margin - box.minX;
  const right = problem.width - problem.margin - box.maxX;
  const bottom = problem.margin - box.minY;
  const top = problem.height - problem.margin - box.maxY;
  const translations = [
    { x: left, y: bottom },
    { x: left, y: top },
    { x: right, y: bottom },
    { x: right, y: top }
  ];
  const xAnchors = [problem.margin];
  const yAnchors = [problem.margin];

  for (const item of placed) {
    const itemBounds = bounds(item.shape);
    xAnchors.push(itemBounds.maxX + problem.kerf);
    yAnchors.push(itemBounds.maxY + problem.kerf);
  }
  for (const x of xAnchors) {
    translations.push({ x: x - box.minX, y: problem.margin - box.minY });
  }
  for (const y of yAnchors) {
    translations.push({ x: problem.margin - box.minX, y: y - box.minY });
  }

  const directions = problem.kerf > 0
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [.707, .707], [-.707, .707], [.707, -.707], [-.707, -.707]]
    : [[0, 0]];
  const boundaryCorners = [
    { x: problem.margin, y: problem.margin },
    { x: problem.margin, y: problem.height - problem.margin },
    { x: problem.width - problem.margin, y: problem.margin },
    { x: problem.width - problem.margin, y: problem.height - problem.margin }
  ];
  for (const corner of boundaryCorners) {
    for (const moving of vertices(rotated)) {
      translations.push({ x: corner.x - moving.x, y: corner.y - moving.y });
    }
  }
  for (const item of placed) {
    for (const fixed of vertices(item.shape)) {
      for (const moving of vertices(rotated)) {
        for (const [dx, dy] of directions) {
          translations.push({
            x: fixed.x - moving.x + dx * problem.kerf,
            y: fixed.y - moving.y + dy * problem.kerf
          });
        }
      }
    }
  }
  const seen = new Set();
  return translations.filter(({ x, y }) => {
    const key = `${Math.round(x / EPSILON)}:${Math.round(y / EPSILON)}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

function fits(problem, candidate, placed) {
  const container = {
    minX: problem.margin,
    minY: problem.margin,
    maxX: problem.width - problem.margin,
    maxY: problem.height - problem.margin
  };
  if (!isInsideBounds(candidate, container, EPSILON)) return false;
  return placed.every(item =>
    overlapArea(candidate, item.shape) <= EPSILON &&
    polygonDistance(candidate, item.shape) >= problem.kerf - EPSILON
  );
}

function placementRank(problem, candidate, placed) {
  const boxes = [...placed.map(item => bounds(item.shape)), bounds(candidate)];
  const minX = Math.min(...boxes.map(box => box.minX));
  const minY = Math.min(...boxes.map(box => box.minY));
  const maxX = Math.max(...boxes.map(box => box.maxX));
  const maxY = Math.max(...boxes.map(box => box.maxY));
  const width = maxX - minX;
  const height = maxY - minY;
  const targetRatio = (problem.width - problem.margin * 2) / (problem.height - problem.margin * 2);
  const actualRatio = width / Math.max(height, EPSILON);
  const ratioPenalty = Math.abs(Math.log(actualRatio / targetRatio));
  const area = width * height;
  return area * (1 + ratioPenalty * 0.3) + (width + height) * 0.05 + (maxX + maxY) * 0.001;
}

export function findBestPlacement(problem, triangle, placed, phase = 0) {
  let best;
  for (const orientation of orientationSet(problem, phase)) {
    const rotated = transform(triangle.shape, orientation);
    for (const translation of candidateTranslations(problem, rotated, placed)) {
      const shape = transform(rotated, translation);
      if (!fits(problem, shape, placed)) continue;
      const rank = placementRank(problem, shape, placed);
      if (!best || rank < best.rank) {
        best = {
          rank,
          shape,
          placement: { ...translation, ...orientation }
        };
      }
    }
  }
  return best ?? null;
}

export function packOrder(problem, order, { phase = 0, allowPartial = false } = {}) {
  const placed = [];
  for (const index of order) {
    const best = findBestPlacement(problem, problem.triangles[index], placed, phase);
    if (!best) {
      if (allowPartial) continue;
      return null;
    }
    placed.push({
      index,
      triangle: problem.triangles[index],
      shape: best.shape,
      placement: best.placement
    });
  }

  const resultProblem = allowPartial
    ? { ...problem, triangles: placed.map(item => item.triangle) }
    : problem;
  const state = allowPartial
    ? placed.map(item => item.placement)
    : placed.sort((left, right) => left.index - right.index).map(item => item.placement);
  return { problem: resultProblem, state, metrics: evaluate(resultProblem, state) };
}

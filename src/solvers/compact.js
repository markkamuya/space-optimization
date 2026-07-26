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
  const count = problem.allowRotation ? 24 : 1;
  const angles = Array.from({ length: count }, (_, index) =>
    problem.allowRotation ? (index + phase) * Math.PI * 2 / count : 0
  );
  return angles.flatMap(angle => problem.allowReflection
    ? [{ angle, reflect: false }, { angle, reflect: true }]
    : [{ angle, reflect: false }]);
}

function candidateTranslations(problem, rotated, placed) {
  const box = bounds(rotated);
  const translations = [{
    x: problem.margin - box.minX,
    y: problem.margin - box.minY
  }];
  const xAnchors = [problem.margin];
  const yAnchors = [problem.margin];

  for (const item of placed) {
    const itemBounds = bounds(item.shape);
    xAnchors.push(itemBounds.maxX + problem.kerf);
    yAnchors.push(itemBounds.maxY + problem.kerf);
  }
  for (const x of xAnchors) {
    for (const y of yAnchors) {
      translations.push({ x: x - box.minX, y: y - box.minY });
    }
  }

  const directions = problem.kerf > 0
    ? [[1, 0], [-1, 0], [0, 1], [0, -1], [.707, .707], [-.707, .707], [.707, -.707], [-.707, -.707]]
    : [[0, 0]];
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
  return translations;
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

export function packOrder(problem, order, { phase = 0 } = {}) {
  const placed = [];
  const state = Array(problem.triangles.length);
  const orientations = orientationSet(problem, phase);

  for (const index of order) {
    let best;
    for (const orientation of orientations) {
      const rotated = transform(problem.triangles[index].shape, orientation);
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
    if (!best) return null;
    placed.push({ index, shape: best.shape });
    state[index] = best.placement;
  }

  return { state, metrics: evaluate(problem, state) };
}

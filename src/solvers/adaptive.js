import { fromSSS, isInsideBounds, overlaps, transform, vertices } from '../geometry/triangle.js';
import { normalizeProblem } from '../core/problem.js';
import { verifyPacking } from '../atlas/verifier.js';

function box(triangle) {
  const points = vertices(triangle);
  return {
    minX: Math.min(...points.map(point => point.x)),
    minY: Math.min(...points.map(point => point.y)),
    maxX: Math.max(...points.map(point => point.x)),
    maxY: Math.max(...points.map(point => point.y))
  };
}

function intersects(left, right) {
  return !(left.maxX <= right.minX || right.maxX <= left.minX ||
    left.maxY <= right.minY || right.maxY <= left.minY);
}

function boundaryAnchors(width, height, step, initialTriangles) {
  const anchors = [];
  for (let x = 0; x <= width + 1e-9; x += step) {
    anchors.push({ x, y: 0 }, { x, y: height });
  }
  for (let y = step; y < height; y += step) {
    anchors.push({ x: 0, y }, { x: width, y });
  }
  for (const triangle of initialTriangles) {
    for (const point of vertices(triangle)) {
      anchors.push(
        point,
        { x: point.x + step / 2, y: point.y },
        { x: point.x - step / 2, y: point.y },
        { x: point.x, y: point.y + step / 2 },
        { x: point.x, y: point.y - step / 2 }
      );
    }
  }
  const seen = new Set();
  return anchors.filter(anchor => {
    if (anchor.x < -1e-9 || anchor.y < -1e-9 || anchor.x > width + 1e-9 || anchor.y > height + 1e-9) return false;
    const id = `${anchor.x.toFixed(6)}:${anchor.y.toFixed(6)}`;
    if (seen.has(id)) return false;
    seen.add(id);
    return true;
  });
}

export function adaptiveBoundarySearch({
  sides,
  width,
  height,
  initialState = [],
  maxPieces = 300,
  orientationCount = 36,
  passes = 3,
  allowReflection = false
}) {
  const shape = fromSSS(...sides);
  const container = { minX: 0, minY: 0, maxX: width, maxY: height };
  const state = initialState.map(placement => ({ ...placement }));
  const placed = state.map(placement => transform(shape, placement));
  const placedBoxes = placed.map(box);
  const minimumSide = Math.min(...sides);
  let attempts = 0;

  for (let pass = 0; pass < passes && state.length < maxPieces; pass += 1) {
    const step = minimumSide / (2 ** (pass + 1));
    const anchors = boundaryAnchors(width, height, step, placed);
    const angles = Array.from({ length: orientationCount }, (_, index) =>
      (index * Math.PI * 2 / orientationCount) + pass * Math.PI / (orientationCount * passes));
    let inserted = 0;
    for (const anchor of anchors) {
      if (state.length >= maxPieces) break;
      for (const angle of angles) {
        attempts += 1;
        for (const reflect of allowReflection ? [false, true] : [false]) {
          const placement = { x: anchor.x, y: anchor.y, angle, reflect };
          const candidate = transform(shape, placement);
          if (!isInsideBounds(candidate, container, 1e-8)) continue;
          const candidateBox = box(candidate);
          const collision = placed.some((triangle, index) =>
            intersects(candidateBox, placedBoxes[index]) && overlaps(triangle, candidate));
          if (collision) continue;
          state.push(placement);
          placed.push(candidate);
          placedBoxes.push(candidateBox);
          inserted += 1;
          break;
        }
        if (inserted && state.at(-1)?.x === anchor.x && state.at(-1)?.y === anchor.y) break;
      }
    }
    if (inserted === 0 && pass > 0) break;
  }

  const triangles = state.map((_, index) => ({
    id: `adaptive-${index + 1}`,
    sides,
    color: '#dfff45'
  }));
  const problem = normalizeProblem({
    name: 'Adaptive boundary-search result',
    width,
    height,
    fillSheet: false,
    maxPieces: Math.max(1, triangles.length),
    allowRotation: true,
    allowReflection,
    triangles
  });
  return {
    solver: 'adaptive-boundary-search/v1',
    problem,
    state,
    attempts,
    inserted: state.length - initialState.length,
    verification: verifyPacking(problem, state)
  };
}

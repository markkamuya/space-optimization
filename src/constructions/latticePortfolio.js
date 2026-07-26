import { normalizeProblem } from '../core/problem.js';
import { fromSSS, isInsideBounds, transform } from '../geometry/triangle.js';
import { evaluate } from '../solvers/scoring.js';

function rotateVector(vector, angle) {
  const cosine = Math.cos(angle);
  const sine = Math.sin(angle);
  return {
    x: vector.x * cosine - vector.y * sine,
    y: vector.x * sine + vector.y * cosine
  };
}

function candidatePlacements(shape, width, height, orientation, maxPieces) {
  const base = shape.b.x - shape.a.x;
  const apexX = shape.c.x;
  const altitude = shape.c.y;
  const u = rotateVector({ x: base, y: 0 }, orientation);
  const v = rotateVector({ x: apexX, y: altitude }, orientation);
  const pairOffset = rotateVector({ x: base + apexX, y: altitude }, orientation);
  const diagonal = Math.ceil(Math.hypot(width, height) / Math.min(base, altitude)) + 4;
  const boundsLimit = { minX: 0, minY: 0, maxX: width, maxY: height };
  const placements = [];
  const seen = new Set();
  for (let row = -diagonal; row <= diagonal; row += 1) {
    for (let column = -diagonal; column <= diagonal; column += 1) {
      const origin = {
        x: column * u.x + row * v.x,
        y: column * u.y + row * v.y
      };
      for (const placement of [
        { x: origin.x, y: origin.y, angle: orientation, reflect: false },
        { x: origin.x + pairOffset.x, y: origin.y + pairOffset.y, angle: orientation + Math.PI, reflect: false }
      ]) {
        if (placements.length >= maxPieces) break;
        if (!isInsideBounds(transform(shape, placement), boundsLimit, 1e-8)) continue;
        const key = `${placement.x.toFixed(8)}:${placement.y.toFixed(8)}:${placement.angle.toFixed(8)}`;
        if (seen.has(key)) continue;
        seen.add(key);
        placements.push(placement);
      }
    }
  }
  return placements;
}

function bestOrientation(shape, width, height, maxPieces, angles, solver) {
  const candidates = angles.map(orientation => ({
    orientation,
    placements: candidatePlacements(shape, width, height, orientation, maxPieces)
  }));
  const best = candidates.sort((left, right) => right.placements.length - left.placements.length)[0];
  return {
    solver,
    orientation: best.orientation,
    placements: best.placements,
    pieceCount: best.placements.length,
    iterations: angles.length
  };
}

function strategyPortfolio(shape, width, height, maxPieces) {
  const horizontal = bestOrientation(shape, width, height, maxPieces, [0], 'horizontal-lattice');
  const vertical = bestOrientation(shape, width, height, maxPieces, [Math.PI / 2], 'vertical-lattice');
  const diagonal = bestOrientation(shape, width, height, maxPieces, [Math.PI / 4], 'diagonal-lattice');
  const constraintAngles = Array.from({ length: 7 }, (_, index) => index * Math.PI / 12);
  const constrained = bestOrientation(
    shape,
    width,
    height,
    maxPieces,
    constraintAngles,
    'discrete-orientation-constraint'
  );
  const localAngles = Array.from({ length: 9 }, (_, index) =>
    Math.max(0, Math.min(Math.PI / 2, constrained.orientation + (index - 4) * Math.PI / 96)));
  const local = bestOrientation(shape, width, height, maxPieces, localAngles, 'boundary-local-search');
  const golden = Math.PI * (3 - Math.sqrt(5));
  const evolutionaryAngles = Array.from({ length: 12 }, (_, index) =>
    ((index * golden + local.orientation / 3) % (Math.PI / 2)));
  const evolutionary = bestOrientation(
    shape,
    width,
    height,
    maxPieces,
    evolutionaryAngles,
    'deterministic-evolutionary-orientation'
  );
  return [horizontal, vertical, diagonal, constrained, local, evolutionary];
}

export function latticePortfolio({
  id,
  name,
  sides,
  width,
  height,
  color = '#5f8cff',
  maxPieces = 300,
  orientations
}) {
  const shape = fromSSS(...sides);
  const trace = orientations
    ? orientations.map((orientation, index) =>
        bestOrientation(shape, width, height, maxPieces, [orientation], `lattice-${index}`))
    : strategyPortfolio(shape, width, height, maxPieces);
  const winner = [...trace].sort((left, right) => right.pieceCount - left.pieceCount)[0];
  const triangles = winner.placements.map((_, index) => ({
    id: `${id}-${index + 1}`,
    sides,
    color
  }));
  const problem = normalizeProblem({
    name,
    width,
    height,
    margin: 0,
    kerf: 0,
    fillSheet: false,
    maxPieces: Math.max(1, triangles.length),
    allowRotation: true,
    allowReflection: false,
    seed: `portfolio-${id}`,
    triangles
  });
  return {
    id,
    problem,
    state: winner.placements,
    metrics: evaluate(problem, winner.placements),
    portfolio: trace.map(({ placements, ...entry }) => ({
      ...entry,
      utilization: placements.length * problem.triangles[0].area / (width * height)
    })),
    winner: winner.solver
  };
}

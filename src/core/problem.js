import { area, fromSSS } from '../geometry/triangle.js';

export const DEFAULT_PROBLEM = Object.freeze({
  name: 'Workshop offcuts',
  width: 30,
  height: 20,
  margin: 0.5,
  kerf: 0,
  fillSheet: true,
  maxPieces: 120,
  allowRotation: true,
  allowReflection: false,
  seed: 'stellar-01',
  triangles: Object.freeze([
    { id: 'A', sides: [5, 5, 6], color: '#f97316' },
    { id: 'B', sides: [5, 5, 6], color: '#fb7185' },
    { id: 'C', sides: [3, 4, 5], color: '#22c55e' },
    { id: 'D', sides: [4, 4, 5], color: '#38bdf8' },
    { id: 'E', sides: [3, 3, 3], color: '#a78bfa' },
    { id: 'F', sides: [6, 4, 5], color: '#facc15' }
  ])
});

export function normalizeProblem(input) {
  if (!input || typeof input !== 'object' || Array.isArray(input)) {
    throw new TypeError('Problem must be an object');
  }
  const width = input.width;
  const height = input.height;
  const margin = input.margin ?? 0;
  const kerf = input.kerf ?? 0;
  const maxPieces = input.maxPieces ?? 80;
  if (![width, height, margin, kerf, maxPieces].every(Number.isFinite)) {
    throw new TypeError('Container dimensions, margin, and kerf must be finite numbers');
  }
  for (const key of ['fillSheet', 'allowRotation', 'allowReflection']) {
    if (input[key] !== undefined && typeof input[key] !== 'boolean') {
      throw new TypeError(`${key} must be a boolean`);
    }
  }
  if (width <= 0 || height <= 0 || margin < 0 || kerf < 0) {
    throw new RangeError('Container dimensions must be positive; margin and kerf cannot be negative');
  }
  if (!Number.isInteger(maxPieces) || maxPieces < 1 || maxPieces > 300) {
    throw new RangeError('Maximum pieces must be an integer from 1 to 300');
  }
  if (width <= margin * 2 || height <= margin * 2) {
    throw new RangeError('Margin leaves no usable packing area');
  }
  if (!Array.isArray(input.triangles) || input.triangles.length === 0) {
    throw new RangeError('At least one triangle is required');
  }

  const triangles = input.triangles.map((definition, index) => {
    const sides = definition?.sides;
    if (!sides || sides.length !== 3) throw new TypeError(`Triangle ${index + 1} needs three sides`);
    if (!sides.every(Number.isFinite)) throw new TypeError(`Triangle ${index + 1} sides must be finite numbers`);
    const shape = fromSSS(...sides);
    return {
      id: String(definition.id ?? index + 1),
      sides,
      color: definition.color ?? '#38bdf8',
      shape,
      area: area(shape)
    };
  });

  return {
    name: String(input.name ?? 'Untitled experiment'),
    width,
    height,
    margin,
    kerf,
    fillSheet: input.fillSheet !== false,
    maxPieces,
    allowRotation: input.allowRotation !== false,
    allowReflection: input.allowReflection === true,
    seed: String(input.seed ?? 'triangle-lab'),
    triangles
  };
}

export function serializableProblem(problem) {
  return {
    name: problem.name,
    width: problem.width,
    height: problem.height,
    margin: problem.margin,
    kerf: problem.kerf,
    fillSheet: problem.fillSheet,
    maxPieces: problem.maxPieces,
    allowRotation: problem.allowRotation,
    allowReflection: problem.allowReflection,
    seed: problem.seed,
    triangles: problem.triangles.map(({ id, sides, color }) => ({ id, sides, color }))
  };
}

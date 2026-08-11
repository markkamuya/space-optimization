import test from 'node:test';
import assert from 'node:assert/strict';

import { DEFAULT_PROBLEM, normalizeProblem, serializableProblem } from '../../src/core/problem.js';
import { createRandom } from '../../src/core/random.js';
import { evaluate } from '../../src/solvers/scoring.js';
import { solveGreedy } from '../../src/solvers/greedy.js';

test('seeded random sequences are reproducible', () => {
  const first = createRandom('same-seed');
  const second = createRandom('same-seed');
  assert.deepEqual(
    Array.from({ length: 10 }, first),
    Array.from({ length: 10 }, second)
  );
});

test('problem normalization validates and prepares triangles', () => {
  const problem = normalizeProblem(DEFAULT_PROBLEM);
  assert.equal(problem.triangles.length, 6);
  assert.ok(problem.triangles.every(item => item.area > 0));
  assert.deepEqual(serializableProblem(problem).triangles[0].sides, [5, 5, 6]);
});

test('problem normalization rejects impossible input', () => {
  assert.throws(
    () => normalizeProblem({ ...DEFAULT_PROBLEM, width: 0 }),
    /must be positive/
  );
  assert.throws(
    () => normalizeProblem({ ...DEFAULT_PROBLEM, triangles: [] }),
    /At least one/
  );
});

test('problem normalization rejects values that require type coercion', () => {
  assert.throws(
    () => normalizeProblem({ ...DEFAULT_PROBLEM, width: '30' }),
    /finite numbers/
  );
  assert.throws(
    () => normalizeProblem({ ...DEFAULT_PROBLEM, allowReflection: 'false' }),
    /allowReflection must be a boolean/
  );
  assert.throws(
    () => normalizeProblem({
      ...DEFAULT_PROBLEM,
      triangles: [{ id: 'string-side', sides: [3, 4, '5'] }]
    }),
    /sides must be finite numbers/
  );
});

test('scoring distinguishes valid and invalid placements', () => {
  const problem = normalizeProblem({
    ...DEFAULT_PROBLEM,
    triangles: DEFAULT_PROBLEM.triangles.slice(0, 2)
  });
  const invalid = evaluate(problem, [
    { x: 2, y: 2, angle: 0 },
    { x: 2, y: 2, angle: 0 }
  ]);
  const valid = evaluate(problem, [
    { x: 2, y: 2, angle: 0 },
    { x: 12, y: 2, angle: 0 }
  ]);
  assert.equal(invalid.valid, false);
  assert.ok(invalid.overlapArea > 0);
  assert.equal(valid.valid, true);
  assert.equal(valid.overlapArea, 0);
});

test('kerf is enforced as a minimum spacing constraint', () => {
  const problem = normalizeProblem({
    ...DEFAULT_PROBLEM,
    kerf: 1,
    triangles: DEFAULT_PROBLEM.triangles.slice(0, 2)
  });
  const tooClose = evaluate(problem, [
    { x: 2, y: 2, angle: 0 },
    { x: 8.2, y: 2, angle: 0 }
  ]);
  assert.equal(tooClose.overlapArea, 0);
  assert.equal(tooClose.valid, false);
  assert.ok(tooClose.spacingViolation > 0);
});

test('greedy solver produces a valid reproducible baseline', () => {
  const problem = normalizeProblem({ ...DEFAULT_PROBLEM, fillSheet: false });
  const first = solveGreedy(problem);
  const second = solveGreedy(problem);
  assert.equal(first.metrics.valid, true);
  assert.deepEqual(first.state, second.state);
  assert.deepEqual(first.state, solveGreedy(problem).state);
});

test('fill mode repeats a triangle type to cover most of the sheet', () => {
  const problem = normalizeProblem({
    ...DEFAULT_PROBLEM,
    triangles: [DEFAULT_PROBLEM.triangles[2]],
    maxPieces: 200
  });
  const result = solveGreedy(problem);
  assert.equal(result.metrics.valid, true);
  assert.ok(result.state.length > 20);
  assert.ok(result.metrics.utilization > 0.7);
});

test('residual pass fills rotated border and corner gaps', () => {
  const problem = normalizeProblem(DEFAULT_PROBLEM);
  const result = solveGreedy(problem);
  assert.equal(result.metrics.valid, true);
  assert.ok(result.state.length > 60);
  assert.ok(result.metrics.utilization > 0.9);
});

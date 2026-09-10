import assert from 'node:assert/strict';
import test from 'node:test';
import { fromSSS, transform } from '../../src/geometry/triangle.js';
import { workshopFocusViewport } from '../../src/ui/workshopFocusLens.js';

const problem = { width: 14.4, height: 8, margin: 0.1 };

test('focus viewport enlarges a triangle without leaving the exact container', () => {
  const placed = transform(fromSSS(1, 1, 1), { x: 13.3, y: 7 });
  const viewport = workshopFocusViewport(problem, placed, 2);
  assert.ok(viewport.minX >= 0);
  assert.ok(viewport.minY >= 0);
  assert.ok(viewport.maxX <= problem.width);
  assert.ok(viewport.maxY <= problem.height);
  assert.ok(viewport.width < problem.width);
  assert.ok(viewport.height < problem.height);
});

test('focus viewport is deterministic and does not mutate triangle coordinates', () => {
  const placed = transform(fromSSS(1, 1, 1), { x: 4.2, y: 3.1, angle: 0.2 });
  const before = JSON.stringify(placed);
  assert.deepEqual(workshopFocusViewport(problem, placed), workshopFocusViewport(problem, placed));
  assert.equal(JSON.stringify(placed), before);
});

import test from 'node:test';
import assert from 'node:assert/strict';

import {
  area,
  fromAAS,
  fromSAS,
  fromSSS,
  overlapArea,
  polygonDistance,
  isInsideBounds,
  overlaps,
  sideLengths,
  transform
} from '../../src/geometry/triangle.js';

const closeTo = (actual, expected, tolerance = 1e-9) => {
  assert.ok(Math.abs(actual - expected) <= tolerance, `${actual} is not close to ${expected}`);
};

test('SSS constructs a triangle with the requested side lengths', () => {
  const result = fromSSS(3, 4, 5);
  const lengths = sideLengths(result);
  closeTo(lengths.a, 3);
  closeTo(lengths.b, 4);
  closeTo(lengths.c, 5);
  closeTo(area(result), 6);
});

test('SSS rejects degenerate and impossible triangles', () => {
  assert.throws(() => fromSSS(1, 2, 3), /triangle inequality/);
  assert.throws(() => fromSSS(-1, 2, 2), /greater than zero/);
});

test('SAS constructs the expected right triangle', () => {
  const result = fromSAS(3, 90, 4);
  closeTo(area(result), 6);
  closeTo(sideLengths(result).a, 5);
});

test('SAS rejects invalid angles', () => {
  assert.throws(() => fromSAS(3, 0, 4), /between 0 and 180/);
  assert.throws(() => fromSAS(3, 180, 4), /between 0 and 180/);
});

test('AAS constructs a triangle with the requested angles and included side', () => {
  const result = fromAAS(45, 45, 2);
  closeTo(sideLengths(result).c, 2);
  closeTo(area(result), 1);
});

test('AAS rejects a non-positive third angle', () => {
  assert.throws(() => fromAAS(90, 90, 2), /positive and sum/);
});

test('rigid transforms preserve side lengths and area', () => {
  const original = fromSSS(3, 4, 5);
  const moved = transform(original, { x: 12, y: -3, angle: Math.PI / 3 });
  closeTo(area(moved), area(original));
  const before = sideLengths(original);
  const after = sideLengths(moved);
  closeTo(after.a, before.a);
  closeTo(after.b, before.b);
  closeTo(after.c, before.c);
});

test('reflection preserves triangle area and side lengths', () => {
  const original = fromSSS(3, 4, 5);
  const reflected = transform(original, { reflect: true });
  closeTo(area(reflected), area(original));
  assert.deepEqual(sideLengths(reflected), sideLengths(original));
});

test('bounds checks include points on the boundary', () => {
  const result = fromSAS(3, 90, 4);
  assert.equal(isInsideBounds(result, { minX: 0, minY: 0, maxX: 4, maxY: 4 }), true);
  assert.equal(isInsideBounds(
    transform(result, { x: -0.01 }),
    { minX: 0, minY: 0, maxX: 4, maxY: 4 }
  ), false);
});

test('triangles with positive interior intersection overlap', () => {
  const left = fromSAS(4, 90, 4);
  const right = transform(left, { x: 1, y: 1 });
  assert.equal(overlaps(left, right), true);
  assert.ok(overlapArea(left, right) > 0);
});

test('edge and point contact are valid non-overlapping packing contact', () => {
  const left = fromSAS(2, 90, 2);
  const edgeTouching = transform(left, { x: 2 });
  const pointTouching = transform(left, { x: 2, y: 2 });
  assert.equal(overlaps(left, edgeTouching), false);
  assert.equal(overlaps(left, pointTouching), false);
  closeTo(polygonDistance(left, edgeTouching), 0);
});

test('separated triangles do not overlap', () => {
  const left = fromSSS(3, 4, 5);
  const right = transform(left, { x: 20 });
  assert.equal(overlaps(left, right), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { certifyPackingStability } from '../../src/research/stability.js';

const triangle = { sides: [1, 1, 1] };
const problem = (overrides = {}) => ({
  name: 'stability fixture', width: 10, height: 10, margin: 0, kerf: 0,
  triangles: [triangle], allowRotation: true, allowReflection: true, ...overrides
});

test('classifies a packing with measurable slack as robust', () => {
  const result = certifyPackingStability(problem(), [{ x: 4, y: 4, angle: 0 }]);
  assert.equal(result.classification, 'robust');
  assert.ok(result.minimumBoundarySlack > 3);
  assert.equal(result.pairConstraints, 0);
});

test('classifies exact boundary and pair contact separately from ambiguity', () => {
  assert.equal(certifyPackingStability(problem(), [{ x: 0, y: 0, angle: 0 }]).classification, 'contact');
  const pair = certifyPackingStability(problem({ triangles: [triangle, triangle] }), [
    { x: 2, y: 2, angle: 0 }, { x: 3, y: 2, angle: 0 }
  ]);
  assert.equal(pair.classification, 'contact');
  assert.equal(pair.minimumPairClearance, 0);
});

test('surfaces geometry accepted only by numerical tolerance', () => {
  const result = certifyPackingStability(problem(), [{ x: -5e-8, y: 0, angle: 0 }]);
  assert.equal(result.valid, true);
  assert.equal(result.classification, 'tolerance_dependent');
  assert.ok(result.acceptedViolation > 0);
});

test('preserves invalid verifier decisions', () => {
  const result = certifyPackingStability(problem(), [{ x: -1e-3, y: 0, angle: 0 }]);
  assert.equal(result.valid, false);
  assert.equal(result.classification, 'invalid');
});

test('public UI names the numerical stability result in plain language', async () => {
  const source = await import('node:fs/promises').then(fs => fs.readFile(
    new URL('../../src/main.js', import.meta.url), 'utf8'));
  assert.match(source, /Numerical stability/);
  assert.match(source, /Exact contact, independently checked/);
  assert.match(source, /Depends on numerical tolerance/);
});

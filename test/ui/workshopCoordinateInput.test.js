import assert from 'node:assert/strict';
import test from 'node:test';
import { validateWorkshopCoordinateInput } from '../../src/ui/workshopCoordinateInput.js';

test('coordinate input preserves exact finite values without clamping', () => {
  assert.deepEqual(validateWorkshopCoordinateInput({ x: '-12.5', y: '999', angle: '6.28318', reflect: true }), {
    valid: true,
    issues: [],
    values: { x: -12.5, y: 999, angle: 6.28318, reflect: true }
  });
});

test('blank and nonfinite coordinate fields fail together without values', () => {
  const result = validateWorkshopCoordinateInput({ x: '', y: 'Infinity', angle: 'not-a-number' });
  assert.equal(result.valid, false);
  assert.equal(result.values, null);
  assert.deepEqual(result.issues.map(issue => issue.field), ['x', 'y', 'angle']);
  assert.match(result.issues[0].message, /finite number/);
});

test('numeric zero remains a valid exact coordinate', () => {
  assert.equal(validateWorkshopCoordinateInput({ x: '0', y: '-0', angle: '0' }).valid, true);
});

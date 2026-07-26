import test from 'node:test';
import assert from 'node:assert/strict';

import { equilateralRows, rightTriangleGrid } from '../../src/constructions/index.js';
import { verifyPacking } from '../../src/atlas/verifier.js';
import { serializableProblem } from '../../src/core/problem.js';

test('right-triangle pairs exactly tile a rectangular grid', () => {
  const result = rightTriangleGrid({ columns: 4, rows: 3, cellWidth: 2, cellHeight: 1 });
  const report = verifyPacking(serializableProblem(result.problem), result.state);
  assert.equal(report.valid, true);
  assert.equal(report.metrics.utilization, 1);
  assert.equal(result.status, 'proven_optimal');
});

test('equilateral reference construction is valid with finite boundary loss', () => {
  const result = equilateralRows({ width: 10, height: 10, side: 1 });
  const report = verifyPacking(serializableProblem(result.problem), result.state);
  assert.equal(report.valid, true);
  assert.ok(report.metrics.utilization > 0.75);
  assert.ok(report.metrics.utilization < 1);
});

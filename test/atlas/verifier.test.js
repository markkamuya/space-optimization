import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

import { DEFAULT_PROBLEM, normalizeProblem, serializableProblem } from '../../src/core/problem.js';
import { verifyAtlasRecord, verifyPacking } from '../../src/atlas/verifier.js';

test('verifier accepts the proven right-grid atlas record', async () => {
  const record = JSON.parse(await readFile(
    new URL('../../atlas/right/right-grid-2x1.json', import.meta.url),
    'utf8'
  ));
  const report = verifyAtlasRecord(record);
  assert.equal(report.valid, true);
  assert.equal(report.metrics.utilization, 1);
  assert.equal(report.optimalityGap, 0);
  assert.match(report.fingerprint, /^tpa1-[0-9a-f]{16}$/);
});

test('verifier rejects overlapping placements independently of solver claims', () => {
  const problem = normalizeProblem({
    ...DEFAULT_PROBLEM,
    fillSheet: false,
    triangles: DEFAULT_PROBLEM.triangles.slice(0, 2)
  });
  const report = verifyPacking(serializableProblem(problem), [
    { x: 2, y: 2, angle: 0 },
    { x: 2, y: 2, angle: 0 }
  ]);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.code === 'OVERLAP'));
});

test('verifier rejects placement values that require type coercion', () => {
  const problem = normalizeProblem({
    ...DEFAULT_PROBLEM,
    fillSheet: false,
    triangles: [DEFAULT_PROBLEM.triangles[2]]
  });
  const report = verifyPacking(serializableProblem(problem), [
    { x: '1', y: 1, angle: 0, reflect: 'false' }
  ]);
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.code === 'INVALID_PLACEMENT'));
});

test('proven status requires proof metadata', () => {
  const report = verifyAtlasRecord({
    format: 'triangle-packing-atlas/v1',
    id: 'missing-proof',
    problem: {
      ...DEFAULT_PROBLEM,
      fillSheet: false,
      triangles: [DEFAULT_PROBLEM.triangles[2]]
    },
    solution: { construction: 'candidate', placements: [{ x: 1, y: 1, angle: 0 }] },
    evidence: { status: 'proven_optimal' },
    provenance: { generator: 'test', createdAt: new Date(0).toISOString() }
  });
  assert.equal(report.valid, false);
  assert.ok(report.errors.some(error => error.code === 'MISSING_PROOF'));
});

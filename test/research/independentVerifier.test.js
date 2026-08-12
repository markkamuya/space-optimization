import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';

import { packingFingerprint } from '../../src/atlas/fingerprint.js';
import { normalizeProblem, serializableProblem } from '../../src/core/problem.js';
import { verifyPacking } from '../../src/atlas/verifier.js';

async function crossVerify(record) {
  const directory = await mkdtemp(join(tmpdir(), 'tpa-cross-verifier-'));
  const source = join(directory, 'release.json');
  await writeFile(source, JSON.stringify({ records: [record] }));
  const result = spawnSync('python3', [
    fileURLToPath(new URL('../../independent_verifier/verify_release.py', import.meta.url)),
    source
  ], { encoding: 'utf8' });
  await rm(directory, { recursive: true });
  return { ...result, report: JSON.parse(result.stdout) };
}

test('independent verifier handles heterogeneous triangle inventories', async () => {
  const problem = normalizeProblem({
    name: 'heterogeneous cross-verification fixture',
    width: 6,
    height: 3,
    margin: 0,
    kerf: 0,
    fillSheet: false,
    maxPieces: 2,
    allowRotation: true,
    allowReflection: false,
    seed: 'cross-verifier-heterogeneous',
    triangles: [
      { id: 'right', sides: [1, 1, Math.SQRT2] },
      { id: 'equilateral', sides: [2, 2, 2] }
    ]
  });
  const placements = [
    { x: 0, y: 0, angle: 0, reflect: false },
    { x: 3, y: 0, angle: 0, reflect: false }
  ];
  const verification = verifyPacking(problem, placements);
  assert.equal(verification.valid, true);
  const serialized = serializableProblem(problem);
  const result = await crossVerify({
    id: 'heterogeneous-fixture',
    problem: serialized,
    solution: { placements },
    verification: {
      fingerprint: packingFingerprint(serialized, placements),
      utilization: verification.metrics.utilization
    }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.report.passed, 1);
});

test('independent verifier enforces rotation and reflection permissions', async () => {
  const problem = normalizeProblem({
    name: 'transformation policy fixture',
    width: 4,
    height: 4,
    margin: 0,
    kerf: 0,
    fillSheet: false,
    maxPieces: 1,
    allowRotation: false,
    allowReflection: false,
    seed: 'cross-verifier-policy',
    triangles: [{ id: 'right', sides: [1, 1, Math.SQRT2] }]
  });
  const placements = [{ x: 1, y: 1, angle: 0.2, reflect: true }];
  const serialized = serializableProblem(problem);
  const result = await crossVerify({
    id: 'transformation-policy-fixture',
    problem: serialized,
    solution: { placements },
    verification: {
      fingerprint: packingFingerprint(serialized, placements),
      utilization: 0.5 / (problem.width * problem.height)
    }
  });
  assert.equal(result.status, 1);
  assert.ok(result.report.failures[0].errors.includes('rotation_not_allowed:0'));
  assert.ok(result.report.failures[0].errors.includes('reflection_not_allowed:0'));
});

test('independent verifier enforces the usable margin boundary', async () => {
  const problem = normalizeProblem({
    name: 'margin fixture',
    width: 4,
    height: 4,
    margin: 0.5,
    kerf: 0,
    fillSheet: false,
    maxPieces: 1,
    allowRotation: true,
    allowReflection: false,
    seed: 'cross-verifier-margin',
    triangles: [{ id: 'small', sides: [0.5, 0.5, 0.5] }]
  });
  const placements = [{ x: 0, y: 0, angle: 0, reflect: false }];
  const serialized = serializableProblem(problem);
  const verification = verifyPacking(serialized, placements);
  const result = await crossVerify({
    id: 'margin-fixture',
    problem: serialized,
    solution: { placements },
    verification: {
      fingerprint: packingFingerprint(serialized, placements),
      utilization: verification.metrics.utilization
    }
  });
  assert.equal(result.status, 1);
  assert.ok(result.report.failures[0].errors.includes('out_of_bounds:0'));
});

test('independent verifier computes utilization over the usable margin area', async () => {
  const problem = normalizeProblem({
    name: 'margin utilization fixture',
    width: 4,
    height: 4,
    margin: 1,
    kerf: 0,
    fillSheet: false,
    maxPieces: 1,
    allowRotation: true,
    allowReflection: false,
    seed: 'cross-verifier-margin-utilization',
    triangles: [{ id: 'right', sides: [1, 1, Math.SQRT2] }]
  });
  const placements = [{ x: 1, y: 1, angle: 0, reflect: false }];
  const serialized = serializableProblem(problem);
  const verification = verifyPacking(serialized, placements);
  assert.equal(verification.valid, true);
  const result = await crossVerify({
    id: 'margin-utilization-fixture',
    problem: serialized,
    solution: { placements },
    verification: {
      fingerprint: packingFingerprint(serialized, placements),
      utilization: verification.metrics.utilization
    }
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  assert.equal(result.report.passed, 1);
});

test('independent verifier enforces nonzero kerf between pieces', async () => {
  const problem = normalizeProblem({
    name: 'kerf fixture',
    width: 5,
    height: 3,
    margin: 0,
    kerf: 1,
    fillSheet: false,
    maxPieces: 2,
    allowRotation: true,
    allowReflection: false,
    seed: 'cross-verifier-kerf',
    triangles: [
      { id: 'right-1', sides: [1, 1, Math.SQRT2] },
      { id: 'right-2', sides: [1, 1, Math.SQRT2] }
    ]
  });
  const placements = [
    { x: 0, y: 0, angle: 0, reflect: false },
    { x: 2, y: 0, angle: 0, reflect: false }
  ];
  const serialized = serializableProblem(problem);
  const verification = verifyPacking(serialized, placements);
  assert.equal(verification.valid, false);
  assert.ok(verification.errors.some(error => error.code === 'SPACING_VIOLATION'));
  const result = await crossVerify({
    id: 'kerf-fixture',
    problem: serialized,
    solution: { placements },
    verification: {
      fingerprint: packingFingerprint(serialized, placements),
      utilization: verification.metrics.utilization
    }
  });
  assert.equal(result.status, 1);
  assert.ok(result.report.failures[0].errors.includes('spacing_violation:0:1'));
});

test('independent verifier reports field-level errors for malformed records', async () => {
  const result = await crossVerify({
    id: 'malformed-placement-fixture',
    problem: {
      width: 4,
      height: 4,
      margin: 0,
      kerf: 0,
      triangles: [{ id: 'right', sides: [1, 1, Math.SQRT2] }]
    },
    solution: { placements: [{ y: 1, angle: 0, reflect: false }] },
    verification: { fingerprint: 'tpa1-invalid', utilization: 0 }
  });
  assert.equal(result.status, 1);
  assert.equal(result.report.records, 1);
  assert.equal(result.report.passed, 0);
  assert.equal(result.report.failures[0].id, 'malformed-placement-fixture');
  assert.ok(result.report.failures[0].errors.includes('invalid_placement_x:0'));
});

test('independent verifier rejects impossible triangle definitions before geometry', async () => {
  const result = await crossVerify({
    id: 'impossible-triangle-fixture',
    problem: {
      width: 4,
      height: 4,
      margin: 0,
      kerf: 0,
      triangles: [{ id: 'impossible', sides: [1, 1, 3] }]
    },
    solution: { placements: [{ x: 1, y: 1, angle: 0, reflect: false }] },
    verification: { fingerprint: 'tpa1-invalid', utilization: 0 }
  });
  assert.equal(result.status, 1);
  assert.ok(result.report.failures[0].errors.includes('invalid_triangle_sides:0'));
  assert.ok(!result.report.failures[0].errors.some(error => error.startsWith('verifier_exception:')));
});

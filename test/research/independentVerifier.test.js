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

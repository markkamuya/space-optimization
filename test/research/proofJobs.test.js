import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  advanceFiniteDomainProofJob,
  createFiniteDomainProofJob,
  verifyFiniteDomainProofJob
} from '../../src/research/proofJobs.js';

const specification = {
  problem: { width: 3, height: 2, sides: [1, 1, Math.SQRT2] },
  specification: { xStep: 1, yStep: 1, angles: [0, Math.PI * 2], reflections: [false], quantum: 1e-9 },
  limits: { maxCandidates: 1000, maxConflictEdges: 100000, maxSearchNodes: 100000 }
};

test('proof jobs resume deterministically through domain, graph, and certificate stages', () => {
  const initialized = createFiniteDomainProofJob(specification);
  const domainReady = advanceFiniteDomainProofJob(initialized, 'domain_ready');
  const graphReady = advanceFiniteDomainProofJob(domainReady, 'graph_ready');
  const resumed = advanceFiniteDomainProofJob(graphReady, 'proof_ready');
  const direct = advanceFiniteDomainProofJob(initialized, 'proof_ready');
  assert.deepEqual(resumed, direct);
  assert.equal(verifyFiniteDomainProofJob(resumed).valid, true);
  assert.equal(resumed.artifacts.certificate.globallyOptimal, false);
});

test('proof jobs reject checkpoint tampering and stage regression', () => {
  const graphReady = advanceFiniteDomainProofJob(createFiniteDomainProofJob(specification), 'graph_ready');
  const tampered = structuredClone(graphReady);
  tampered.artifacts.graph.adjacency[0] = [];
  assert.equal(verifyFiniteDomainProofJob(tampered).valid, false);
  assert.throws(() => advanceFiniteDomainProofJob(tampered, 'proof_ready'), /invalid_proof_job/);
  assert.throws(() => advanceFiniteDomainProofJob(graphReady, 'domain_ready'), /stage_regression/);
});

test('proof job CLI atomically resumes the same checkpoint', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tpa-proof-job-'));
  const specificationPath = join(directory, 'specification.json');
  const checkpointPath = join(directory, 'checkpoint.json');
  await writeFile(specificationPath, JSON.stringify(specification));
  for (const stage of ['domain_ready', 'graph_ready', 'proof_ready']) {
    const result = spawnSync(process.execPath, [
      'cli/finite-domain-proof-job.js', specificationPath, checkpointPath, '--stop-after', stage
    ], { cwd: new URL('../..', import.meta.url), encoding: 'utf8' });
    assert.equal(result.status, 0, result.stderr || result.stdout);
    assert.equal(JSON.parse(result.stdout).stage, stage);
  }
  const checkpoint = JSON.parse(await readFile(checkpointPath, 'utf8'));
  assert.equal(verifyFiniteDomainProofJob(checkpoint).valid, true);
});

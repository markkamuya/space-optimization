import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { workQueueDigest } from '../../src/research/distributed.js';

test('lease CLI migrates, recovers, and verifies a v1 ledger atomically', async () => {
  const root = new URL('../..', import.meta.url);
  const queue = JSON.parse(await readFile(new URL('../../public/work-queue-v2.json', import.meta.url), 'utf8'));
  const directory = await mkdtemp(join(tmpdir(), 'tpa-lease-recovery-'));
  const ledgerPath = join(directory, 'ledger.json');
  await writeFile(ledgerPath, JSON.stringify({ format: 'tpa-worker-lease-ledger/v1',
    queueDigest: workQueueDigest(queue.tasks), leases: {}, attempts: {} }));
  const recovered = spawnSync(process.execPath, ['cli/worker-leases.js', 'recover', ledgerPath],
    { cwd: root, encoding: 'utf8', env: { ...process.env, TPA_WORKER_TIME: '1000' } });
  assert.equal(recovered.status, 0, recovered.stderr || recovered.stdout);
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  assert.equal(ledger.format, 'tpa-worker-lease-ledger/v2');
  assert.equal(ledger.events[0].type, 'v1_migration');
  const verified = spawnSync(process.execPath, ['cli/worker-leases.js', 'verify', ledgerPath],
    { cwd: root, encoding: 'utf8' });
  assert.equal(verified.status, 0, verified.stderr || verified.stdout);
  assert.equal(JSON.parse(verified.stdout).valid, true);
});

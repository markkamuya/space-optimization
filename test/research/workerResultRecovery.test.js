import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createLeaseLedger } from '../../src/research/distributed.js';

test('result CLI recovers identical evidence from its durable journal after output loss', async () => {
  const root = new URL('../..', import.meta.url);
  const queue = JSON.parse(await readFile(new URL('../../public/work-queue-v2.json', import.meta.url), 'utf8'));
  const directory = await mkdtemp(join(tmpdir(), 'tpa-result-recovery-'));
  const ledgerPath = join(directory, 'ledger.json');
  const candidatePath = join(directory, 'candidate.json');
  const journalPath = join(directory, 'journal.json');
  const outputPath = join(directory, 'evidence.json');
  const recoveredPath = join(directory, 'recovered.json');
  await writeFile(ledgerPath, JSON.stringify(createLeaseLedger(queue.tasks)));
  await writeFile(candidatePath, JSON.stringify({ taskId: 'unknown-task', workerId: 'worker-a' }));
  const ingested = spawnSync(process.execPath, ['cli/worker-results.js', ledgerPath, candidatePath,
    '--journal', journalPath, '--output', outputPath],
  { cwd: root, encoding: 'utf8', env: { ...process.env, TPA_WORKER_TIME: '1000' } });
  assert.equal(ingested.status, 1, ingested.stderr || ingested.stdout);
  const recovered = spawnSync(process.execPath, ['cli/worker-results.js', '--recover',
    '--journal', journalPath, '--output', recoveredPath], { cwd: root, encoding: 'utf8' });
  assert.equal(recovered.status, 1, recovered.stderr || recovered.stdout);
  assert.deepEqual(JSON.parse(await readFile(recoveredPath, 'utf8')),
    JSON.parse(await readFile(outputPath, 'utf8')));
  const independent = spawnSync('python3', ['independent_verifier/verify_ingestion_journal.py', journalPath],
    { cwd: root, encoding: 'utf8' });
  assert.equal(independent.status, 0, independent.stderr || independent.stdout);
});

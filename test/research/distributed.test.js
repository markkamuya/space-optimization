import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { RESEARCH_RECORDS } from '../../src/research/dataset.js';
import { canonicalRecord } from '../../src/research/registry.js';
import {
  buildWorkQueue, checkpointWorkerLease, claimWorkerTask, createLeaseLedger,
  createIngestionJournal,
  expireWorkerLeases, ingestWorkerResults, migrateLeaseLedger, rankVerifiedWorkerResults,
  recoverLeaseLedger, replayLeaseLedger,
  recordWorkerIngestion, recoverLatestWorkerIngestion, verifyIngestionJournal,
  validateWorkerResult, verifyWorkerIngestionEvidence, workQueueDigest
} from '../../src/research/distributed.js';

test('distributed queue is prioritized and contains reproducibility contracts', () => {
  const queue = buildWorkQueue(RESEARCH_RECORDS.map(canonicalRecord));
  assert.ok(queue.length > 0);
  assert.equal(queue[0].status, 'open');
  assert.equal(queue[0].submissionContract.coordinatesRequired, true);
  assert.ok(queue[0].baselineUtilization <= queue[0].upperBound);
});

test('ingestion receipts make retries idempotent and recover the last durable evidence', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const tasks = buildWorkQueue(records);
  const ledger = createLeaseLedger(tasks);
  const candidates = [{ taskId: 'unknown-task', workerId: 'worker-a' }];
  const journal = createIngestionJournal(tasks);
  const first = recordWorkerIngestion(tasks, ledger, candidates, records, 1000, journal);
  assert.equal(first.valid, true);
  assert.equal(first.idempotent, false);
  assert.equal(first.evidence.rejected.length, 1);
  assert.equal(verifyIngestionJournal(first.journal).valid, true);
  const retry = recordWorkerIngestion(tasks, ledger, candidates, records, 1001, first.journal);
  assert.equal(retry.idempotent, true);
  assert.deepEqual(retry.journal, first.journal);
  assert.deepEqual(recoverLatestWorkerIngestion(first.journal).evidence, first.evidence);
  const tampered = structuredClone(first.journal);
  tampered.receipts[0].evidence.rejected[0].errors.push('forged');
  assert.equal(verifyIngestionJournal(tampered).valid, false);
});

test('independent verifier accepts receipts and rejects receipt tampering', async () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const tasks = buildWorkQueue(records);
  const journal = createIngestionJournal(tasks);
  const recorded = recordWorkerIngestion(tasks, createLeaseLedger(tasks),
    [{ taskId: 'unknown-task', workerId: 'worker-a' }], records, 1000, journal);
  const directory = await mkdtemp(join(tmpdir(), 'tpa-ingestion-journal-'));
  const path = join(directory, 'journal.json');
  await writeFile(path, JSON.stringify(recorded.journal));
  const accepted = spawnSync('python3', ['independent_verifier/verify_ingestion_journal.py', path],
    { cwd: new URL('../..', import.meta.url), encoding: 'utf8' });
  assert.equal(accepted.status, 0, accepted.stderr || accepted.stdout);
  const tampered = structuredClone(recorded.journal);
  tampered.receipts[0].evidence.rejected[0].workerId = 'forged';
  await writeFile(path, JSON.stringify(tampered));
  const rejected = spawnSync('python3', ['independent_verifier/verify_ingestion_journal.py', path],
    { cwd: new URL('../..', import.meta.url), encoding: 'utf8' });
  assert.equal(rejected.status, 1, rejected.stderr || rejected.stdout);
});

test('public recovery schemas expose event and receipt integrity contracts', async () => {
  const { readFile } = await import('node:fs/promises');
  const leaseSchema = JSON.parse(await readFile(new URL('../../schemas/worker-lease-ledger.schema.json', import.meta.url), 'utf8'));
  const receiptSchema = JSON.parse(await readFile(new URL('../../schemas/worker-ingestion-journal.schema.json', import.meta.url), 'utf8'));
  assert.match(JSON.stringify(leaseSchema), /lease_checkpointed/);
  assert.match(JSON.stringify(receiptSchema), /leaseLedgerSha256/);
  assert.match(JSON.stringify(receiptSchema), /batchSha256/);
});

test('durable lease events replay identically after a materialized-state crash', () => {
  const tasks = buildWorkQueue(RESEARCH_RECORDS.map(canonicalRecord));
  const worker = { workerId: 'worker-a', requestId: 'claim-1',
    maxOrientationEvaluations: 5000, maxWallTimeSeconds: 900 };
  const claimed = claimWorkerTask(tasks, createLeaseLedger(tasks), worker, 1000, 100);
  assert.equal(replayLeaseLedger(claimed.ledger).valid, true);
  const crashed = structuredClone(claimed.ledger);
  crashed.leases = {};
  const recovered = recoverLeaseLedger(crashed);
  assert.equal(recovered.valid, true);
  assert.deepEqual(recovered.ledger, claimed.ledger);
  assert.equal(replayLeaseLedger(recovered.ledger).valid, true);
});

test('claim and checkpoint request ids are idempotent across retries', () => {
  const tasks = buildWorkQueue(RESEARCH_RECORDS.map(canonicalRecord));
  const worker = { workerId: 'worker-a', requestId: 'claim-1',
    maxOrientationEvaluations: 5000, maxWallTimeSeconds: 900 };
  const first = claimWorkerTask(tasks, createLeaseLedger(tasks), worker, 1000, 100);
  const retry = claimWorkerTask(tasks, first.ledger, worker, 1000, 100);
  assert.equal(retry.idempotent, true);
  assert.deepEqual(retry.lease, first.lease);
  assert.deepEqual(retry.ledger, first.ledger);
  const checkpoint = { taskId: first.lease.taskId, token: first.lease.token,
    workerId: worker.workerId, requestId: 'checkpoint-1', orientationEvaluations: 10,
    bestUtilization: 0.5 };
  const saved = checkpointWorkerLease(first.ledger, checkpoint, 1050, 100);
  const retried = checkpointWorkerLease(saved.ledger, checkpoint, 1050, 100);
  assert.equal(retried.idempotent, true);
  assert.deepEqual(retried.ledger, saved.ledger);
});

test('v1 lease ledgers migrate deterministically without losing active leases', () => {
  const tasks = buildWorkQueue(RESEARCH_RECORDS.map(canonicalRecord));
  const legacy = { format: 'tpa-worker-lease-ledger/v1', queueDigest: workQueueDigest(tasks),
    leases: { sample: { taskId: 'sample', token: 'token', expiresAt: 100 } }, attempts: { sample: 1 } };
  const first = migrateLeaseLedger(tasks, legacy, 50);
  const second = migrateLeaseLedger(tasks, legacy, 50);
  assert.deepEqual(first, second);
  assert.deepEqual(first.leases, legacy.leases);
  assert.equal(replayLeaseLedger(first).valid, true);
});

test('workers claim distinct capability-matched tasks from a digest-bound ledger', () => {
  const tasks = buildWorkQueue(RESEARCH_RECORDS.map(canonicalRecord));
  let ledger = createLeaseLedger(tasks);
  assert.equal(ledger.queueDigest, workQueueDigest(tasks));
  const worker = { workerId: 'worker-a', maxOrientationEvaluations: 5000, maxWallTimeSeconds: 900 };
  const first = claimWorkerTask(tasks, ledger, worker, 1000, 100);
  assert.equal(first.valid, true);
  assert.equal(first.lease.taskId, tasks[0].taskId);
  ledger = first.ledger;
  const second = claimWorkerTask(tasks, ledger, { ...worker, workerId: 'worker-b' }, 1000, 100);
  assert.notEqual(second.lease.taskId, first.lease.taskId);
  assert.equal(claimWorkerTask([...tasks].reverse(), ledger, worker, 1000).valid, false);
});

test('expired leases requeue deterministically and checkpoints extend valid ownership', () => {
  const tasks = buildWorkQueue(RESEARCH_RECORDS.map(canonicalRecord));
  const worker = { workerId: 'worker-a', maxOrientationEvaluations: 5000, maxWallTimeSeconds: 900 };
  const claimed = claimWorkerTask(tasks, createLeaseLedger(tasks), worker, 1000, 100);
  const checkpoint = checkpointWorkerLease(claimed.ledger, {
    taskId: claimed.lease.taskId,
    token: claimed.lease.token,
    workerId: worker.workerId,
    orientationEvaluations: 100,
    bestUtilization: claimed.lease.taskId ? 0.5 : 0
  }, 1050, 200);
  assert.equal(checkpoint.valid, true);
  assert.equal(checkpoint.ledger.leases[claimed.lease.taskId].expiresAt, 1250);
  assert.equal(expireWorkerLeases(checkpoint.ledger, 1251).leases[claimed.lease.taskId], undefined);
  const reclaimed = claimWorkerTask(tasks, expireWorkerLeases(checkpoint.ledger, 1251), worker, 1251, 100);
  assert.equal(reclaimed.lease.taskId, claimed.lease.taskId);
  assert.equal(reclaimed.lease.attempt, 2);
});

test('worker results must improve the assigned baseline', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-1',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: task.baselineUtilization
  }, record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('does_not_improve_baseline'));
});

test('worker results cannot forge utilization independently of coordinates', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-forged-score',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: 1
  }, record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('utilization_mismatch'));
  assert.ok(result.errors.includes('does_not_improve_baseline'));
  assert.equal(result.verification.valid, true);
});

test('worker results are verified against the assigned problem identity', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-wrong-container',
    problem: { ...record.problem, width: record.problem.width * 2 },
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('problem_identity_mismatch'));
});

test('worker results are bound to the queued experiment and exact baseline', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult({
    ...task,
    experimentId: `${task.experimentId}-tampered`,
    baselineFingerprint: 'tpa1-stale',
    baselineUtilization: task.baselineUtilization - 0.1
  }, {
    recordId: task.recordId,
    seed: 'worker-stale-task',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('task_experiment_mismatch'));
  assert.ok(result.errors.includes('stale_baseline_fingerprint'));
  assert.ok(result.errors.includes('stale_baseline_utilization'));
});

test('worker validation accepts zero as a deterministic seed', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 0,
    solverVersion: 'atlas-worker/1.0.0',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.equal(result.errors.includes('invalid_seed'), false);
  assert.equal(result.errors.includes('missing_solver_version'), false);
});

test('worker validation requires a solver version for reproducibility', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-without-version',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.ok(result.errors.includes('missing_solver_version'));
});

test('worker validation rejects non-reproducible seed and version values', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const base = {
    taskId: task.taskId,
    recordId: task.recordId,
    experimentId: task.experimentId,
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization,
    budgetUsed: { orientationEvaluations: 1, wallTimeSeconds: 1 }
  };
  for (const seed of [{}, Number.NaN, Number.POSITIVE_INFINITY, '', ' '.repeat(2), 'x'.repeat(257)]) {
    const result = validateWorkerResult(task, { ...base, seed, solverVersion: 'solver/1.0.0' }, record);
    assert.ok(result.errors.includes('invalid_seed'));
  }
  for (const solverVersion of [{}, 'solver\nforged', 'x'.repeat(257)]) {
    const result = validateWorkerResult(task, { ...base, seed: 0, solverVersion }, record);
    assert.ok(result.errors.includes('missing_solver_version'));
  }
});

test('worker validation reports malformed envelopes without throwing', () => {
  const result = validateWorkerResult(null, null, null);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('invalid_task'));
  assert.ok(result.errors.includes('invalid_candidate'));
});

test('worker results are bound to the exact task and experiment identifiers', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    taskId: `${task.taskId}-wrong`,
    recordId: task.recordId,
    experimentId: `${task.experimentId}-wrong`,
    seed: 'worker-replayed-envelope',
    solverVersion: 'atlas-worker/1.0.0',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.ok(result.errors.includes('task_id_mismatch'));
  assert.ok(result.errors.includes('experiment_id_mismatch'));
});

test('worker results must report valid usage within the assigned budget', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const candidate = {
    taskId: task.taskId,
    recordId: task.recordId,
    experimentId: task.experimentId,
    seed: 'worker-over-budget',
    solverVersion: 'atlas-worker/1.0.0',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization,
    budgetUsed: {
      orientationEvaluations: task.budget.orientationEvaluations + 1,
      wallTimeSeconds: task.budget.wallTimeSeconds + 0.1
    }
  };
  const result = validateWorkerResult(task, candidate, record);
  assert.ok(result.errors.includes('orientation_budget_exceeded'));
  assert.ok(result.errors.includes('wall_time_budget_exceeded'));

  candidate.budgetUsed = { orientationEvaluations: -1, wallTimeSeconds: Number.NaN };
  const malformed = validateWorkerResult(task, candidate, record);
  assert.ok(malformed.errors.includes('invalid_budget_usage'));
});

test('verified worker ranking is deterministic and keeps one best result per task', () => {
  const results = [
    { taskId: 'b', utilization: 0.8, fingerprint: 'f3', workerId: 'w2' },
    { taskId: 'a', utilization: 0.7, fingerprint: 'f1', workerId: 'w1' },
    { taskId: 'a', utilization: 0.9, fingerprint: 'f2', workerId: 'w2' },
    { taskId: 'c', utilization: 0.95, fingerprint: 'f2', workerId: 'w3' }
  ];
  assert.deepEqual(rankVerifiedWorkerResults(results).map(result => result.taskId), ['a', 'b']);
  assert.equal(rankVerifiedWorkerResults(results)[0].utilization, 0.9);
});

test('ingestion rejects stale or stolen leases before ranking geometry', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const tasks = buildWorkQueue(records);
  const worker = { workerId: 'worker-a', maxOrientationEvaluations: 5000, maxWallTimeSeconds: 900 };
  const claimed = claimWorkerTask(tasks, createLeaseLedger(tasks), worker, 1000, 100);
  const task = tasks[0];
  const record = records.find(candidate => candidate.id === task.recordId);
  const evidence = ingestWorkerResults(tasks, claimed.ledger, [{
    taskId: task.taskId,
    recordId: task.recordId,
    experimentId: task.experimentId,
    workerId: 'worker-thief',
    leaseToken: claimed.lease.token,
    seed: 'stolen',
    solverVersion: 'atlas-worker/1.0.0',
    budgetUsed: { orientationEvaluations: 1, wallTimeSeconds: 1 },
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }], records, 1050);
  assert.equal(evidence.accepted.length, 0);
  assert.ok(evidence.rejected[0].errors.includes('lease_identity_mismatch'));
  assert.match(evidence.sha256, /^[0-9a-f]{64}$/);
  assert.equal(verifyWorkerIngestionEvidence(evidence), true);
  evidence.rejected[0].errors.push('tampered');
  assert.equal(verifyWorkerIngestionEvidence(evidence), false);
});

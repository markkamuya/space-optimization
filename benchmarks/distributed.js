import { performance } from 'node:perf_hooks';
import { readFile } from 'node:fs/promises';
import {
  claimWorkerTask, createLeaseLedger, rankVerifiedWorkerResults, recoverLeaseLedger, replayLeaseLedger
} from '../src/research/distributed.js';

const tasks = JSON.parse(await readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8')).tasks;
let ledger = createLeaseLedger(tasks);
const started = performance.now();
let claimed = 0;
for (let index = 0; index < tasks.length; index += 1) {
  const result = claimWorkerTask(tasks, ledger, {
    workerId: `benchmark-${index}`,
    requestId: `claim-${index}`,
    maxOrientationEvaluations: 5000,
    maxWallTimeSeconds: 900
  }, 1000, 900);
  ledger = result.ledger;
  if (result.lease) claimed += 1;
}
const leaseMs = performance.now() - started;
const retryStarted = performance.now();
let idempotentRetries = 0;
for (let index = 0; index < 5_000; index += 1) {
  const workerIndex = index % tasks.length;
  const result = claimWorkerTask(tasks, ledger, {
    workerId: `benchmark-${workerIndex}`, requestId: `claim-${workerIndex}`,
    maxOrientationEvaluations: 5000, maxWallTimeSeconds: 900
  }, 1000, 900);
  if (result.idempotent) idempotentRetries += 1;
}
const retryMs = performance.now() - retryStarted;
const crashed = structuredClone(ledger);
crashed.leases = {};
const recoveryStarted = performance.now();
const recovered = recoverLeaseLedger(crashed);
const recoveryMs = performance.now() - recoveryStarted;
const candidates = Array.from({ length: 10_000 }, (_, index) => ({
  taskId: tasks[index % tasks.length].taskId,
  utilization: (index % 1000) / 1000,
  fingerprint: `f-${index}`,
  workerId: `w-${index}`
}));
const rankStarted = performance.now();
const winners = rankVerifiedWorkerResults(candidates);
const rankMs = performance.now() - rankStarted;
const report = {
  format: 'tpa-distributed-benchmark/v1', tasks: tasks.length, claimed,
  candidates: candidates.length, winners: winners.length,
  leaseMs: Number(leaseMs.toFixed(2)), rankMs: Number(rankMs.toFixed(2)),
  idempotentRetries, retryMs: Number(retryMs.toFixed(2)),
  recoveryMs: Number(recoveryMs.toFixed(2)), recoveredEvents: recovered.recoveredEvents,
  passes: claimed === tasks.length && winners.length === tasks.length &&
    idempotentRetries === 5_000 && recovered.valid && replayLeaseLedger(recovered.ledger).valid &&
    leaseMs < 5000 && retryMs < 10000 && recoveryMs < 1000 && rankMs < 5000
};
console.log(JSON.stringify(report, null, 2));
if (!report.passes) process.exitCode = 1;

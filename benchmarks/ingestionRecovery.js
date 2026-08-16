import { performance } from 'node:perf_hooks';
import {
  createIngestionJournal, createLeaseLedger, recordWorkerIngestion,
  recoverLatestWorkerIngestion, verifyIngestionJournal
} from '../src/research/distributed.js';

const tasks = Array.from({ length: 10_000 }, (_, index) => ({ taskId: `scale-${index}` }));
const leaseLedger = createLeaseLedger(tasks);
const batches = Array.from({ length: 100 }, (_, batch) =>
  Array.from({ length: 100 }, (_, index) => ({
    taskId: `unknown-${batch}-${index}`, workerId: `worker-${index}`
  })));
let journal = createIngestionJournal(tasks);
const ingestStarted = performance.now();
for (let index = 0; index < batches.length; index += 1) {
  const result = recordWorkerIngestion(tasks, leaseLedger, batches[index], [], 1000 + index, journal);
  if (!result.valid || result.idempotent) throw new Error('ingestion_benchmark_record_failed');
  journal = result.journal;
}
const ingestMs = performance.now() - ingestStarted;
const retryStarted = performance.now();
let retries = 0;
for (let index = 0; index < batches.length; index += 1) {
  const result = recordWorkerIngestion(tasks, leaseLedger, batches[index], [], 2000 + index, journal);
  if (result.idempotent) retries += 1;
}
const retryMs = performance.now() - retryStarted;
const verifyStarted = performance.now();
const verification = verifyIngestionJournal(journal);
const verificationMs = performance.now() - verifyStarted;
const recoveryStarted = performance.now();
const recovery = recoverLatestWorkerIngestion(journal);
const recoveryMs = performance.now() - recoveryStarted;
const report = {
  format: 'tpa-ingestion-recovery-benchmark/v1', tasks: tasks.length,
  candidates: batches.length * batches[0].length, receipts: journal.receipts.length,
  rejected: verification.rejected, idempotentRetries: retries,
  ingestMs: Number(ingestMs.toFixed(2)), retryMs: Number(retryMs.toFixed(2)),
  verificationMs: Number(verificationMs.toFixed(2)), recoveryMs: Number(recoveryMs.toFixed(2)),
  passes: verification.valid && recovery.valid && verification.rejected === 10_000 &&
    retries === 100 && ingestMs < 10_000 && retryMs < 10_000 && verificationMs < 1000 && recoveryMs < 1000
};
console.log(JSON.stringify(report, null, 2));
if (!report.passes) process.exitCode = 1;

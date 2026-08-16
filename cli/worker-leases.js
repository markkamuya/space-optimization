#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import {
  claimWorkerTask, checkpointWorkerLease, createLeaseLedger, migrateLeaseLedger,
  recoverLeaseLedger, replayLeaseLedger
} from '../src/research/distributed.js';

const [command, ledgerPath, payloadPath] = process.argv.slice(2);
if (!['claim', 'checkpoint', 'recover', 'verify'].includes(command) || !ledgerPath ||
  (['claim', 'checkpoint'].includes(command) && !payloadPath)) {
  throw new Error('Usage: worker-leases.js claim|checkpoint|recover|verify ledger.json [payload.json]');
}
const queueRelease = JSON.parse(await readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8'));
const tasks = queueRelease.tasks;
let ledger;
try { ledger = JSON.parse(await readFile(ledgerPath, 'utf8')); } catch { ledger = createLeaseLedger(tasks); }
const now = Number(process.env.TPA_WORKER_TIME ?? Date.now());
if (ledger.format === 'tpa-worker-lease-ledger/v1') ledger = migrateLeaseLedger(tasks, ledger, now);
const payload = payloadPath ? JSON.parse(await readFile(payloadPath, 'utf8')) : null;
const result = command === 'claim' ? claimWorkerTask(tasks, ledger, payload, now)
  : command === 'checkpoint' ? checkpointWorkerLease(ledger, payload, now)
    : command === 'recover' ? recoverLeaseLedger(ledger) : replayLeaseLedger(ledger);
if (result.valid && ['claim', 'checkpoint', 'recover'].includes(command)) {
  const temporary = `${ledgerPath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(result.ledger, null, 2)}\n`);
  await rename(temporary, ledgerPath);
}
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;

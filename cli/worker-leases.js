#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import { claimWorkerTask, checkpointWorkerLease, createLeaseLedger } from '../src/research/distributed.js';

const [command, ledgerPath, payloadPath] = process.argv.slice(2);
if (!['claim', 'checkpoint'].includes(command) || !ledgerPath || !payloadPath) {
  throw new Error('Usage: worker-leases.js claim|checkpoint ledger.json payload.json');
}
const queueRelease = JSON.parse(await readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8'));
const tasks = queueRelease.tasks;
let ledger;
try { ledger = JSON.parse(await readFile(ledgerPath, 'utf8')); } catch { ledger = createLeaseLedger(tasks); }
const payload = JSON.parse(await readFile(payloadPath, 'utf8'));
const now = Number(process.env.TPA_WORKER_TIME ?? Date.now());
const result = command === 'claim'
  ? claimWorkerTask(tasks, ledger, payload, now)
  : checkpointWorkerLease(ledger, payload, now);
if (result.valid) {
  const temporary = `${ledgerPath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(result.ledger, null, 2)}\n`);
  await rename(temporary, ledgerPath);
}
console.log(JSON.stringify(result, null, 2));
if (!result.valid) process.exitCode = 1;

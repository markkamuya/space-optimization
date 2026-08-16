#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import {
  createIngestionJournal, ingestWorkerResults, recordWorkerIngestion, recoverLatestWorkerIngestion
} from '../src/research/distributed.js';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args.splice(outputIndex, 2)[1] : null;
const journalIndex = args.indexOf('--journal');
const journalPath = journalIndex >= 0 ? args.splice(journalIndex, 2)[1] : null;
const recover = args.includes('--recover');
if (recover) args.splice(args.indexOf('--recover'), 1);
const [ledgerPath, ...candidatePaths] = args;
if ((!recover && (!ledgerPath || candidatePaths.length === 0)) || (recover && !journalPath)) {
  throw new Error('Usage: worker-results.js ledger.json result.json [...] [--journal receipts.json] [--output evidence.json] [--recover]');
}
const [queue, release, ledger, ...candidates] = await Promise.all([
  readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/atlas-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  ledgerPath ? readFile(ledgerPath, 'utf8').then(JSON.parse) : Promise.resolve(null),
  ...candidatePaths.map(path => readFile(path, 'utf8').then(JSON.parse))
]);
const now = Number(process.env.TPA_WORKER_TIME ?? Date.now());
let journal = null;
if (journalPath) {
  try { journal = JSON.parse(await readFile(journalPath, 'utf8')); }
  catch { journal = createIngestionJournal(queue.tasks); }
}
const result = recover ? recoverLatestWorkerIngestion(journal)
  : journal ? recordWorkerIngestion(queue.tasks, ledger, candidates, release.records, now, journal)
    : { valid: true, evidence: ingestWorkerResults(queue.tasks, ledger, candidates, release.records, now) };
if (!result.valid) throw new Error(`worker_ingestion_failed:${result.errors.join(',')}`);
const evidence = result.evidence;
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
if (journalPath && !recover) {
  const temporary = `${journalPath}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(result.journal, null, 2)}\n`);
  await rename(temporary, journalPath);
}
if (output) {
  const temporary = `${output}.tmp-${process.pid}`;
  await writeFile(temporary, serialized);
  await rename(temporary, output);
}
console.log(serialized.trimEnd());
if (!evidence || evidence.rejected.length > 0 || evidence.winners.length === 0) process.exitCode = 1;

#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import { ingestWorkerResults } from '../src/research/distributed.js';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args.splice(outputIndex, 2)[1] : null;
const [ledgerPath, ...candidatePaths] = args;
if (!ledgerPath || candidatePaths.length === 0) {
  throw new Error('Usage: worker-results.js ledger.json result.json [...] [--output evidence.json]');
}
const [queue, release, ledger, ...candidates] = await Promise.all([
  readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/atlas-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(ledgerPath, 'utf8').then(JSON.parse),
  ...candidatePaths.map(path => readFile(path, 'utf8').then(JSON.parse))
]);
const now = Number(process.env.TPA_WORKER_TIME ?? Date.now());
const evidence = ingestWorkerResults(queue.tasks, ledger, candidates, release.records, now);
const serialized = `${JSON.stringify(evidence, null, 2)}\n`;
if (output) {
  const temporary = `${output}.tmp-${process.pid}`;
  await writeFile(temporary, serialized);
  await rename(temporary, output);
}
console.log(serialized.trimEnd());
if (evidence.rejected.length > 0 || evidence.winners.length === 0) process.exitCode = 1;

import { readFile } from 'node:fs/promises';
import { auditDependencyLock } from '../src/research/supplyChain.js';

const [manifest, lock] = await Promise.all([
  readFile(new URL('../package.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../package-lock.json', import.meta.url), 'utf8').then(JSON.parse)
]);
const report = auditDependencyLock(manifest, lock);
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;

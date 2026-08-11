import { readFile, writeFile } from 'node:fs/promises';
import { auditRecords } from '../src/research/audit.js';

const [release, queue, challengeBoard] = await Promise.all([
  readFile(new URL('../public/atlas-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/community-challenges-v2.json', import.meta.url), 'utf8').then(JSON.parse)
]);
const report = auditRecords(release.records, {
  transitions: release.transitions,
  workQueue: queue.tasks,
  challenges: challengeBoard.challenges
});
await writeFile(new URL('../public/audit-v2.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  passed: report.passed,
  ...report.summary,
  findings: report.findings.slice(0, 10)
}, null, 2));
if (!report.passed) process.exitCode = 1;

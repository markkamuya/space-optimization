import { readFile, writeFile } from 'node:fs/promises';
import { auditRecords } from '../src/research/audit.js';

const release = JSON.parse(await readFile(new URL('../public/atlas-v2.json', import.meta.url), 'utf8'));
const report = auditRecords(release.records, { transitions: release.transitions });
await writeFile(new URL('../public/audit-v2.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  passed: report.passed,
  ...report.summary,
  findings: report.findings.slice(0, 10)
}, null, 2));
if (!report.passed) process.exitCode = 1;

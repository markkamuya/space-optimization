import { readFile, writeFile } from 'node:fs/promises';
import { auditRecords } from '../src/research/audit.js';
import { auditArtifactChecksum, auditReleaseManifest } from '../src/research/artifacts.js';

const [datasetPayload, queue, challengeBoard, csv, checksumFile, manifest] = await Promise.all([
  readFile(new URL('../public/atlas-v2.json', import.meta.url), 'utf8'),
  readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/community-challenges-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/atlas-v2.csv', import.meta.url), 'utf8'),
  readFile(new URL('../public/atlas-v2.sha256', import.meta.url), 'utf8'),
  readFile(new URL('../releases/2.0.0-canonical.json', import.meta.url), 'utf8').then(JSON.parse)
]);
const release = JSON.parse(datasetPayload);
const report = auditRecords(release.records, {
  transitions: release.transitions,
  workQueue: queue.tasks,
  challenges: challengeBoard.challenges,
  coverage: release.coverage,
  csv
});
const artifactChecksum = auditArtifactChecksum(datasetPayload, checksumFile, manifest);
const releaseManifest = auditReleaseManifest(manifest, release);
for (const code of [...artifactChecksum.errors, ...releaseManifest.errors]) {
  report.findings.push({ severity: 'critical', code });
}
report.summary.critical = report.findings.filter(finding => finding.severity === 'critical').length;
report.passed = report.passed && artifactChecksum.valid && releaseManifest.valid;
await writeFile(new URL('../public/audit-v2.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  passed: report.passed,
  ...report.summary,
  findings: report.findings.slice(0, 10)
}, null, 2));
if (!report.passed) process.exitCode = 1;

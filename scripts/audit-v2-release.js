import { readFile, writeFile } from 'node:fs/promises';
import { auditRecords } from '../src/research/audit.js';
import { auditArtifactChecksum, auditReleaseManifest } from '../src/research/artifacts.js';
import { verifyShardedRelease } from '../src/research/shardedRelease.js';

const [datasetPayload, queue, challengeBoard, finiteDomainProofs, finiteDomainProofJobs, csv, checksumFile, manifest] = await Promise.all([
  readFile(new URL('../public/atlas-v2.json', import.meta.url), 'utf8'),
  readFile(new URL('../public/work-queue-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/community-challenges-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/finite-domain-proofs-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/finite-domain-proof-jobs-v2.json', import.meta.url), 'utf8').then(JSON.parse),
  readFile(new URL('../public/atlas-v2.csv', import.meta.url), 'utf8'),
  readFile(new URL('../public/atlas-v2.sha256', import.meta.url), 'utf8'),
  readFile(new URL('../releases/2.0.0-canonical.json', import.meta.url), 'utf8').then(JSON.parse)
]);
const release = JSON.parse(datasetPayload);
const shardedIndex = JSON.parse(await readFile(new URL('../public/atlas-v2-shards.json', import.meta.url), 'utf8'));
const shardFiles = new Map(await Promise.all(shardedIndex.shards.map(async descriptor => [
  descriptor.path,
  await readFile(new URL(`../public/${descriptor.path}`, import.meta.url), 'utf8')
])));
const report = auditRecords(release.records, {
  transitions: release.transitions,
  workQueue: queue.tasks,
  challenges: challengeBoard.challenges,
  finiteDomainProofs,
  finiteDomainProofJobs,
  coverage: release.coverage,
  csv
});
const artifactChecksum = auditArtifactChecksum(datasetPayload, checksumFile, manifest);
const releaseManifest = auditReleaseManifest(manifest, release);
const shardedRelease = verifyShardedRelease(shardedIndex, shardFiles, release);
for (const code of [...artifactChecksum.errors, ...releaseManifest.errors, ...shardedRelease.errors]) {
  report.findings.push({ severity: 'critical', code });
}
report.summary.critical = report.findings.filter(finding => finding.severity === 'critical').length;
report.summary.shardedRecords = shardedRelease.records;
report.passed = report.passed && artifactChecksum.valid && releaseManifest.valid && shardedRelease.valid;
await writeFile(new URL('../public/audit-v2.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  passed: report.passed,
  ...report.summary,
  findings: report.findings.slice(0, 10)
}, null, 2));
if (!report.passed) process.exitCode = 1;

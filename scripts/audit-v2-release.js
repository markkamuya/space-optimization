import { readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { auditRecords } from '../src/research/audit.js';
import { auditArtifactChecksum, auditReleaseManifest } from '../src/research/artifacts.js';
import { verifyShardedRelease } from '../src/research/shardedRelease.js';
import { contributionStatus } from '../src/contributions/promotion.js';
import { verifyAuthorizedReviewLedger, verifyReviewAuthority } from '../src/contributions/reviewAuthority.js';
import {
  createLeaseLedger, distributedRecoveryHealth, verifyIngestionJournal
} from '../src/research/distributed.js';

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
const contributionLedger = JSON.parse(await readFile(new URL('../contributions/ledger.json', import.meta.url), 'utf8'));
const reviewAuthority = JSON.parse(await readFile(new URL('../review-authority/registry.json', import.meta.url), 'utf8'));
const storedContributionStatus = JSON.parse(await readFile(new URL('../public/contribution-status-v2.json', import.meta.url), 'utf8'));
const ingestionJournal = JSON.parse(await readFile(new URL('../public/worker-ingestion-journal-v2.json', import.meta.url), 'utf8'));
const storedRecoveryHealth = JSON.parse(await readFile(new URL('../public/distributed-recovery-health-v2.json', import.meta.url), 'utf8'));
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
if (JSON.stringify(contributionStatus(contributionLedger, reviewAuthority)) !== JSON.stringify(storedContributionStatus)) {
  report.findings.push({ severity: 'critical', code: 'CONTRIBUTION_STATUS_DRIFT' });
}
const authorityReport = verifyReviewAuthority(reviewAuthority);
const authorizedLedger = verifyAuthorizedReviewLedger(contributionLedger, reviewAuthority);
const independentAuthority = spawnSync('python3', ['independent_verifier/verify_review_authority.py',
  'review-authority/registry.json', 'contributions/ledger.json'], { encoding: 'utf8' });
if (!authorityReport.valid) report.findings.push({ severity: 'critical', code: 'REVIEW_AUTHORITY_INVALID' });
if (!authorizedLedger.valid) report.findings.push({ severity: 'critical', code: 'REVIEW_LEDGER_AUTHORIZATION_INVALID' });
if (independentAuthority.status !== 0) report.findings.push({ severity: 'critical', code: 'REVIEW_AUTHORITY_CROSS_VERIFY_FAILED' });
const ingestionReport = verifyIngestionJournal(ingestionJournal);
const expectedRecoveryHealth = distributedRecoveryHealth(createLeaseLedger(queue.tasks), ingestionJournal);
const independentIngestion = spawnSync('python3', ['independent_verifier/verify_ingestion_journal.py',
  'public/worker-ingestion-journal-v2.json'], { encoding: 'utf8' });
if (!ingestionReport.valid) report.findings.push({ severity: 'critical', code: 'INGESTION_JOURNAL_INVALID' });
if (JSON.stringify(expectedRecoveryHealth) !== JSON.stringify(storedRecoveryHealth)) {
  report.findings.push({ severity: 'critical', code: 'DISTRIBUTED_RECOVERY_HEALTH_DRIFT' });
}
if (independentIngestion.status !== 0) report.findings.push({ severity: 'critical', code: 'INGESTION_CROSS_VERIFY_FAILED' });
report.summary.critical = report.findings.filter(finding => finding.severity === 'critical').length;
report.summary.shardedRecords = shardedRelease.records;
report.summary.contributionsTracked = contributionLedger.entries.length;
report.summary.reviewAuthorityKeys = reviewAuthority.keys.length;
report.summary.ingestionReceipts = ingestionReport.receipts;
report.passed = report.passed && artifactChecksum.valid && releaseManifest.valid && shardedRelease.valid &&
  authorityReport.valid && authorizedLedger.valid && independentAuthority.status === 0 &&
  ingestionReport.valid && expectedRecoveryHealth.ready && independentIngestion.status === 0;
await writeFile(new URL('../public/audit-v2.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`);
console.log(JSON.stringify({
  passed: report.passed,
  ...report.summary,
  findings: report.findings.slice(0, 10)
}, null, 2));
if (!report.passed) process.exitCode = 1;

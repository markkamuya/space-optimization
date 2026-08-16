import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RESEARCH_RECORDS } from '../src/research/dataset.js';
import { adaptiveBoundarySearch } from '../src/solvers/adaptive.js';
import { boundBundle } from '../src/research/bounds.js';
import {
  CANONICAL_FORMAT,
  canonicalRecord,
  detectPhaseTransitions,
  validateCanonicalRecords
} from '../src/research/registry.js';
import {
  buildWorkQueue, createIngestionJournal, createLeaseLedger, distributedRecoveryHealth
} from '../src/research/distributed.js';
import { canonicalCoverage } from '../src/research/release.js';
import { buildCanonicalCsv } from '../src/research/exports.js';
import { buildShardedRelease } from '../src/research/shardedRelease.js';
import { verifyFiniteDomainProof } from '../src/research/finiteDomain.js';
import {
  advanceFiniteDomainProofJob,
  createFiniteDomainProofJob,
  verifyFiniteDomainProofJob
} from '../src/research/proofJobs.js';
import { contributionStatus } from '../src/contributions/promotion.js';
import { verifyAuthorizedReviewLedger, verifyReviewAuthority } from '../src/contributions/reviewAuthority.js';

const adaptiveTargets = new Set([...RESEARCH_RECORDS]
  .filter(record => record.bounds.optimalityGap > 0 && record.verification.pieceCount < 300)
  .sort((left, right) => right.bounds.optimalityGap - left.bounds.optimalityGap)
  .slice(0, 12)
  .map(record => record.id));
const optimizedSources = RESEARCH_RECORDS.map(record => {
  if (!adaptiveTargets.has(record.id)) return record;
  const result = adaptiveBoundarySearch({
    sides: record.problem.triangles[0].sides,
    width: record.problem.width,
    height: record.problem.height,
    initialState: record.solution.placements,
    maxPieces: 300,
    orientationCount: 24,
    passes: 2,
    allowReflection: record.problem.allowReflection
  });
  if (!result.verification.valid || result.inserted === 0) return record;
  return {
    ...record,
    problem: result.verification.normalizedProblem,
    solution: {
      construction: 'adaptive-boundary-search/v1',
      placements: result.state
    },
    verification: {
      valid: true,
      fingerprint: result.verification.fingerprint,
      utilization: result.verification.metrics.utilization,
      pieceCount: result.state.length
    },
    bounds: boundBundle(result.problem, { metrics: result.verification.metrics }),
    solver: {
      ...record.solver,
      winner: 'adaptive-boundary-search',
      portfolio: [
        ...record.solver.portfolio,
        {
          solver: 'adaptive-boundary-search',
          iterations: result.attempts,
          pieceCount: result.state.length,
          utilization: result.verification.metrics.utilization
        }
      ],
      budget: {
        ...record.solver.budget,
        adaptiveAttempts: result.attempts
      },
      environment: {
        ...record.solver.environment,
        algorithmVersion: 'adaptive-boundary-search/v1'
      }
    },
    descriptors: {
      ...record.descriptors,
      boundaryWaste: 1 - result.verification.metrics.utilization,
      boundaryGapAnalysis: {
        ...record.descriptors.boundaryGapAnalysis,
        unusedArea: result.problem.width * result.problem.height - result.verification.metrics.triangleArea,
        priority: 'repaired'
      }
    },
    provenance: {
      ...record.provenance,
      generator: 'adaptive-boundary-search/v1',
      seed: `adaptive-${record.id}`
    },
    adaptiveImprovement: {
      insertedPieces: result.inserted,
      attempts: result.attempts,
      previousUtilization: record.verification.utilization
    }
  };
});
const records = optimizedSources.map(canonicalRecord);
const audit = validateCanonicalRecords(records);
if (!audit.valid) throw new Error(`Canonical registry failed: ${JSON.stringify(audit.errors.slice(0, 5))}`);

const transitions = detectPhaseTransitions(records);
const queue = buildWorkQueue(records);
const releaseLeaseLedger = createLeaseLedger(queue);
const ingestionJournal = createIngestionJournal(queue);
const recoveryHealth = distributedRecoveryHealth(releaseLeaseLedger, ingestionJournal);
if (!recoveryHealth.ready) throw new Error('Distributed recovery health failed');
const proofSpecification = JSON.parse(await readFile(
  new URL('../proofs/finite-domain-right-control.spec.json', import.meta.url), 'utf8'
));
const contributionLedger = JSON.parse(await readFile(
  new URL('../contributions/ledger.json', import.meta.url), 'utf8'
));
const reviewAuthority = JSON.parse(await readFile(
  new URL('../review-authority/registry.json', import.meta.url), 'utf8'
));
if (!verifyReviewAuthority(reviewAuthority).valid ||
  !verifyAuthorizedReviewLedger(contributionLedger, reviewAuthority).valid) {
  throw new Error('Contribution review authority failed replay');
}
const publicContributionStatus = contributionStatus(contributionLedger, reviewAuthority);
const proofJob = advanceFiniteDomainProofJob(createFiniteDomainProofJob(proofSpecification), 'proof_ready');
const proofCertificate = proofJob.artifacts.certificate;
if (!verifyFiniteDomainProof(proofCertificate, proofSpecification.limits).valid) {
  throw new Error('Generated finite-domain control proof failed replay');
}
if (!verifyFiniteDomainProofJob(proofJob).valid) throw new Error('Generated finite-domain proof job failed replay');
const proofIndex = {
  format: 'triangle-packing-finite-domain-proofs/v1',
  version: '2.0.0',
  proofs: [{
    proofId: proofSpecification.proofId,
    linkedRecordId: proofSpecification.linkedRecordId,
    relation: proofSpecification.relation,
    claim: 'Optimal only within the declared finite candidate domain; not a global packing claim.',
    certificate: proofCertificate
  }]
};
const proofJobIndex = {
  format: 'tpa-finite-domain-proof-jobs/v1',
  version: '2.0.0',
  jobs: [{
    jobId: proofSpecification.proofId,
    linkedRecordId: proofSpecification.linkedRecordId,
    proofSha256: proofCertificate.sha256,
    checkpoint: proofJob
  }]
};
const release = {
  format: CANONICAL_FORMAT,
  version: '2.0.0',
  releasedAt: '2026-07-26T00:00:00.000Z',
  license: 'CC-BY-4.0',
  citation: 'CITATION.cff',
  methodology: 'docs/METHODOLOGY_V2.md',
  claimPolicy: 'literature/CLAIM_POLICY.md',
  finiteDomainProofIndex: 'public/finite-domain-proofs-v2.json',
  finiteDomainProofJobIndex: 'public/finite-domain-proof-jobs-v2.json',
  shardedReleaseIndex: 'public/atlas-v2-shards.json',
  contributionStatus: 'public/contribution-status-v2.json',
  reviewAuthority: 'review-authority/registry.json',
  distributedRecoveryHealth: 'public/distributed-recovery-health-v2.json',
  ingestionJournal: 'public/worker-ingestion-journal-v2.json',
  verificationPolicy: {
    independentImplementations: ['src/atlas/verifier.js', 'independent_verifier/verify_release.py'],
    tolerancePolicy: 'docs/NUMERICAL_POLICY.md',
    certificateRequired: true
  },
  coverage: canonicalCoverage(records),
  transitions,
  records
};
const shardedRelease = buildShardedRelease(release, { recordsPerShard: 76 });

const payload = `${JSON.stringify(release)}\n`;
const checksum = createHash('sha256').update(payload).digest('hex');

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await mkdir(new URL('../public/atlas-v2-shards/', import.meta.url), { recursive: true });
await mkdir(new URL('../releases/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/atlas-v2.json', import.meta.url), payload);
await writeFile(new URL('../public/atlas-v2.csv', import.meta.url), buildCanonicalCsv(records));
await writeFile(new URL('../public/atlas-v2.sha256', import.meta.url), `${checksum}  atlas-v2.json\n`);
await writeFile(new URL('../public/work-queue-v2.json', import.meta.url), `${JSON.stringify({ format: 'tpa-work-queue/v1', version: '2.0.0', tasks: queue }, null, 2)}\n`);
await writeFile(new URL('../public/finite-domain-proofs-v2.json', import.meta.url), `${JSON.stringify(proofIndex, null, 2)}\n`);
await writeFile(new URL('../public/finite-domain-proof-jobs-v2.json', import.meta.url), `${JSON.stringify(proofJobIndex, null, 2)}\n`);
await writeFile(new URL('../public/contribution-status-v2.json', import.meta.url), `${JSON.stringify(publicContributionStatus, null, 2)}\n`);
await writeFile(new URL('../public/worker-ingestion-journal-v2.json', import.meta.url), `${JSON.stringify(ingestionJournal, null, 2)}\n`);
await writeFile(new URL('../public/distributed-recovery-health-v2.json', import.meta.url), `${JSON.stringify(recoveryHealth, null, 2)}\n`);
await writeFile(new URL('../public/atlas-v2-shards.json', import.meta.url), `${JSON.stringify(shardedRelease.index, null, 2)}\n`);
for (const [path, shardPayload] of shardedRelease.files) {
  await writeFile(new URL(`../public/${path}`, import.meta.url), shardPayload);
}
await writeFile(new URL('../releases/2.0.0-canonical.json', import.meta.url), `${JSON.stringify({
  format: 'triangle-packing-atlas-release-manifest/v2',
  version: '2.0.0',
  dataset: 'public/atlas-v2.json',
  csv: 'public/atlas-v2.csv',
  queue: 'public/work-queue-v2.json',
  finiteDomainProofs: 'public/finite-domain-proofs-v2.json',
  finiteDomainProofJobs: 'public/finite-domain-proof-jobs-v2.json',
  shardedRelease: 'public/atlas-v2-shards.json',
  reviewAuthority: 'review-authority/registry.json',
  distributedRecoveryHealth: 'public/distributed-recovery-health-v2.json',
  ingestionJournal: 'public/worker-ingestion-journal-v2.json',
  sha256: checksum,
  records: records.length,
  audit,
  immutable: true,
  doi: null,
  doiStatus: 'ready-for-provider-deposit'
}, null, 2)}\n`);
console.log(`Canonical v2: ${records.length} records, ${transitions.length} transitions, ${queue.length} open tasks, sha256 ${checksum}.`);

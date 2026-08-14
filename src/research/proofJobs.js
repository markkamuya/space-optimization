import { createHash } from 'node:crypto';
import {
  buildFiniteConflictGraph,
  canonicalJson,
  generateFiniteCandidateDomain,
  solveFiniteDomainCertificate,
  verifyFiniteDomainProof
} from './finiteDomain.js';

const STAGES = Object.freeze(['initialized', 'domain_ready', 'graph_ready', 'proof_ready']);

function digest(value) {
  return createHash('sha256').update(canonicalJson(value)).digest('hex');
}

function seal(statement) {
  const canonicalPayload = canonicalJson(statement);
  return { ...statement, canonicalPayload, sha256: createHash('sha256').update(canonicalPayload).digest('hex') };
}

export function createFiniteDomainProofJob(specification) {
  const statement = {
    format: 'tpa-finite-domain-proof-job/v1',
    stage: 'initialized',
    specification: structuredClone(specification),
    artifacts: {}
  };
  return seal(statement);
}

export function verifyFiniteDomainProofJob(job) {
  const errors = [];
  const { canonicalPayload, sha256, ...statement } = job ?? {};
  if (job?.format !== 'tpa-finite-domain-proof-job/v1' || !STAGES.includes(job?.stage)) errors.push('invalid_job_format');
  if (canonicalPayload !== canonicalJson(statement) || sha256 !== digest(statement)) errors.push('job_digest_mismatch');
  const stageIndex = STAGES.indexOf(job?.stage);
  const limits = job?.specification?.limits ?? {};
  let domain;
  try {
    if (stageIndex >= 1) {
      domain = generateFiniteCandidateDomain(job.specification.problem, job.specification.specification, limits);
      if (canonicalJson(domain) !== canonicalJson(job.artifacts?.domain)) errors.push('job_domain_mismatch');
    }
    if (stageIndex >= 2) {
      const graph = buildFiniteConflictGraph(domain, limits);
      if (canonicalJson(graph) !== canonicalJson(job.artifacts?.graph)) errors.push('job_graph_mismatch');
    }
    if (stageIndex >= 3 && !verifyFiniteDomainProof(job.artifacts?.certificate, limits).valid) {
      errors.push('job_certificate_invalid');
    }
  } catch {
    errors.push('job_artifact_invalid');
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], stage: job?.stage ?? null };
}

export function advanceFiniteDomainProofJob(job, targetStage = 'proof_ready') {
  if (!STAGES.includes(targetStage)) throw new RangeError('invalid_target_stage');
  const verification = verifyFiniteDomainProofJob(job);
  if (!verification.valid) throw new Error(`invalid_proof_job:${verification.errors.join(',')}`);
  const currentIndex = STAGES.indexOf(job.stage);
  const targetIndex = STAGES.indexOf(targetStage);
  if (targetIndex < currentIndex) throw new RangeError('proof_job_stage_regression');
  const artifacts = structuredClone(job.artifacts);
  const limits = job.specification.limits ?? {};
  if (targetIndex >= 1 && currentIndex < 1) {
    artifacts.domain = generateFiniteCandidateDomain(job.specification.problem, job.specification.specification, limits);
  }
  if (targetIndex >= 2 && currentIndex < 2) {
    artifacts.graph = buildFiniteConflictGraph(artifacts.domain, limits);
  }
  if (targetIndex >= 3 && currentIndex < 3) {
    artifacts.certificate = solveFiniteDomainCertificate(artifacts.domain, artifacts.graph, limits);
  }
  return seal({
    format: 'tpa-finite-domain-proof-job/v1',
    stage: targetStage,
    specification: structuredClone(job.specification),
    artifacts
  });
}

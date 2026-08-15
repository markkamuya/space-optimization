import { createHash } from 'node:crypto';
import { assessSubmission } from '../atlas/submission.js';
import { buildVerifiedIncumbentIndex, queryVerifiedIncumbentIndex } from '../atlas/published.js';
import { verifyContributionLedger } from './ledger.js';
import { verifyPacking } from '../atlas/verifier.js';
import { boundBundle } from '../research/bounds.js';
import { canonicalRecord } from '../research/registry.js';
import { normalizeProblem } from '../core/problem.js';

export const PROMOTION_PLAN_FORMAT = 'triangle-packing-promotion-plan/v1';
const digestObject = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function decodeCandidate(entry) {
  const bytes = Buffer.from(entry.candidatePayloadBase64, 'base64');
  if (createHash('sha256').update(bytes).digest('hex') !== entry.candidateSha256) {
    throw new Error(`candidate_payload_digest_mismatch:${entry.candidateId}`);
  }
  return JSON.parse(bytes.toString('utf8'));
}

export function buildPromotionPlan(ledger, currentRecords, plannedAt) {
  const ledgerVerification = verifyContributionLedger(ledger);
  if (!ledgerVerification.valid) throw new Error(`invalid_ledger:${ledgerVerification.errors.join(',')}`);
  if (!Array.isArray(currentRecords) || !Number.isFinite(Date.parse(plannedAt))) {
    throw new TypeError('Current records and plannedAt are required');
  }
  const index = buildVerifiedIncumbentIndex(currentRecords);
  const currentDigest = queryVerifiedIncumbentIndex(index, null, null).sourceDigest;
  if (currentDigest !== ledger.incumbentIndexDigest) throw new Error('stale_incumbent_index');

  const operations = ledger.entries
    .filter(entry => entry.state === 'approved_for_promotion')
    .map(entry => {
      const candidate = decodeCandidate(entry);
      const replay = assessSubmission(candidate, index);
      if (replay.disposition !== entry.disposition ||
        !['improves_record', 'new_problem'].includes(replay.disposition)) {
        throw new Error(`promotion_replay_mismatch:${entry.candidateId}`);
      }
      const operation = replay.disposition === 'improves_record' ? 'replace' : 'add';
      const reviewEvent = entry.events.at(-1);
      if (!reviewEvent?.canonicalMetadata) throw new Error(`canonical_metadata_missing:${entry.candidateId}`);
      return {
        candidateId: entry.candidateId,
        operation,
        targetRecordId: replay.comparison.bestKnownId,
        submittedRecordId: candidate.id,
        contributor: candidate.provenance.contributor,
        submittedEvidence: candidate.evidence.status,
        publishEvidence: 'verified_construction',
        fingerprint: replay.verification.fingerprint,
        utilization: replay.verification.metrics.utilization,
        candidate,
        canonicalMetadata: reviewEvent.canonicalMetadata,
        reviewEventSha256: reviewEvent.sha256
      };
    });
  const statement = {
    format: PROMOTION_PLAN_FORMAT,
    plannedAt,
    sourceLedgerSha256: ledger.sha256,
    incumbentIndexDigest: currentDigest,
    operations
  };
  return { ...statement, sha256: digestObject(statement) };
}

function promotedRecord(operation, incumbent, plannedAt) {
  const candidate = operation.candidate;
  const metadata = operation.canonicalMetadata;
  const replay = verifyPacking(candidate.problem, candidate.solution.placements);
  if (!replay.valid || replay.fingerprint !== operation.fingerprint) throw new Error('promotion_geometry_drift');
  if (incumbent?.family && incumbent.family !== metadata.family) throw new Error('promotion_family_drift');
  if (incumbent?.parameters && JSON.stringify(incumbent.parameters) !== JSON.stringify(metadata.parameters)) {
    throw new Error('promotion_parameters_drift');
  }
  const historyEvent = {
    version: '2.0.0', event: 'contribution_promotion', candidateId: operation.candidateId,
    utilization: replay.metrics.utilization, fingerprint: replay.fingerprint,
    contributor: candidate.provenance.contributor, timestamp: plannedAt,
    reviewEventSha256: operation.reviewEventSha256
  };
  if (incumbent?.experimentId) {
    const boundProblem = normalizeProblem(replay.normalizedProblem);
    const solver = candidate.provenance.generator;
    const source = {
      ...incumbent,
      family: metadata.family,
      parameters: metadata.parameters,
      pattern: metadata.pattern,
      status: 'best_computational',
      problem: replay.normalizedProblem,
      solution: { construction: `${solver}/${candidate.provenance.version}`, placements: replay.normalizedState },
      verification: { valid: true, fingerprint: replay.fingerprint,
        utilization: replay.metrics.utilization, pieceCount: replay.normalizedState.length },
      bounds: boundBundle(boundProblem, { metrics: replay.metrics }),
      solver: {
        portfolio: [{ solver, iterations: 1, pieceCount: replay.normalizedState.length,
          utilization: replay.metrics.utilization }],
        winner: solver,
        budget: { strategies: 1, orientationEvaluations: 1, deterministic: true },
        environment: { runtime: 'contributor-reported', platform: 'portable-reference',
          architecture: 'portable-reference', algorithmVersion: candidate.provenance.version }
      },
      descriptors: {
        ...incumbent.descriptors,
        boundaryWaste: 1 - replay.metrics.utilization,
        boundaryGapAnalysis: {
          ...incumbent.descriptors?.boundaryGapAnalysis,
          unusedArea: replay.normalizedProblem.width * replay.normalizedProblem.height - replay.metrics.triangleArea,
          priority: 'contributed improvement'
        }
      },
      provenance: { ...candidate.provenance, generator: solver }
    };
    const canonical = canonicalRecord(source);
    return { ...canonical, history: [...(incumbent.history ?? []), historyEvent] };
  }
  return {
    ...incumbent,
    ...candidate,
    id: incumbent?.id ?? candidate.id,
    family: metadata.family,
    parameters: metadata.parameters,
    pattern: metadata.pattern,
    status: 'verified_construction',
    evidence: { ...candidate.evidence, status: 'verified_construction',
      submittedStatus: candidate.evidence.status },
    verification: { valid: true, fingerprint: replay.fingerprint,
      utilization: replay.metrics.utilization, optimalityGap: replay.optimalityGap },
    history: [...(incumbent?.history ?? []), historyEvent]
  };
}

export function applyPromotionPlan(currentRecords, plan, ledger) {
  const verification = verifyPromotionPlan(plan, ledger);
  if (!verification.valid) throw new Error(`invalid_promotion_plan:${verification.errors.join(',')}`);
  const records = structuredClone(currentRecords);
  const receipts = [];
  for (const operation of plan.operations) {
    const index = operation.operation === 'replace'
      ? records.findIndex(record => record.id === operation.targetRecordId)
      : -1;
    if (operation.operation === 'replace' && index < 0) throw new Error('promotion_target_missing');
    if (operation.operation === 'add' && records.some(record => record.id === operation.submittedRecordId)) {
      throw new Error('promotion_id_collision');
    }
    const promoted = promotedRecord(operation, index >= 0 ? records[index] : null, plan.plannedAt);
    if (index >= 0) records[index] = promoted;
    else records.push(promoted);
    receipts.push({ candidateId: operation.candidateId, recordId: promoted.id,
      fingerprint: promoted.verification.fingerprint, operation: operation.operation });
  }
  const statement = { format: 'triangle-packing-promotion-receipt/v1',
    planSha256: plan.sha256, recordsSha256: digestObject(records), receipts };
  return { records, receipt: { ...statement, sha256: digestObject(statement) } };
}

export function verifyPromotionPlan(plan, ledger) {
  const errors = [];
  const statement = plan && typeof plan === 'object'
    ? Object.fromEntries(Object.entries(plan).filter(([key]) => key !== 'sha256'))
    : null;
  if (plan?.format !== PROMOTION_PLAN_FORMAT || !statement || digestObject(statement) !== plan?.sha256) {
    errors.push('promotion_plan_digest_mismatch');
  }
  if (plan?.sourceLedgerSha256 !== ledger?.sha256) errors.push('promotion_ledger_mismatch');
  const approved = new Set((ledger?.entries ?? [])
    .filter(entry => entry.state === 'approved_for_promotion').map(entry => entry.candidateId));
  for (const operation of plan?.operations ?? []) {
    if (!approved.delete(operation.candidateId)) errors.push(`candidate_not_approved:${operation.candidateId}`);
    if (operation.publishEvidence !== 'verified_construction') {
      errors.push(`evidence_overpromotion:${operation.candidateId}`);
    }
  }
  if (approved.size > 0) errors.push('approved_candidate_missing');
  return { valid: errors.length === 0, errors, operations: plan?.operations?.length ?? 0 };
}

export function contributionStatus(ledger) {
  const verification = verifyContributionLedger(ledger);
  if (!verification.valid) throw new Error('invalid_contribution_ledger');
  const counts = {};
  for (const entry of ledger.entries) counts[entry.state] = (counts[entry.state] ?? 0) + 1;
  return {
    format: 'triangle-packing-contribution-status/v1',
    ledgerSha256: ledger.sha256,
    updatedAt: ledger.issuedAt,
    counts,
    stages: [
      { id: 'verify', label: 'Geometry and record comparison', automatic: true },
      { id: 'quarantine', label: 'Quarantined evidence review', automatic: false },
      { id: 'promotion', label: 'Stale-safe promotion plan', automatic: false },
      { id: 'release', label: 'Full release checks and publication', automatic: false }
    ]
  };
}

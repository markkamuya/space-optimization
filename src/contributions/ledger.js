import { createHash } from 'node:crypto';
import { incumbentSnapshotDigest, verifySubmissionAttestation } from '../atlas/attestation.js';
import { authorizeReview, UNSIGNED_MIGRATION_CUTOFF } from './reviewAuthority.js';

export const CONTRIBUTION_LEDGER_FORMAT = 'triangle-packing-contribution-ledger/v1';

const sha256 = value => createHash('sha256').update(value).digest('hex');
const digestObject = value => sha256(JSON.stringify(value));

function candidateId(result) {
  return `candidate-${result.candidateSha256}`;
}

function seal(statement) {
  return { ...statement, sha256: digestObject(statement) };
}

function validIsoDate(value) {
  return typeof value === 'string' && Number.isFinite(Date.parse(value));
}

export function createContributionLedger(bundle, issuedAt) {
  if (!validIsoDate(issuedAt)) throw new TypeError('issuedAt must be an ISO date');
  if (bundle?.format !== 'triangle-packing-submission-batch/v1' ||
    !Array.isArray(bundle?.incumbentSnapshot) || !Array.isArray(bundle?.results)) {
    throw new TypeError('A portable submission bundle with an incumbent snapshot is required');
  }
  if (!verifySubmissionAttestation(bundle.attestation, bundle.results, bundle.incumbentSnapshot)) {
    throw new Error('submission_attestation_invalid');
  }
  const snapshotDigest = incumbentSnapshotDigest(bundle.incumbentSnapshot);
  if (snapshotDigest !== bundle.attestation.incumbentSnapshotSha256) {
    throw new Error('incumbent_snapshot_digest_mismatch');
  }
  const seen = new Set();
  const entries = bundle.results.map(result => {
    if (typeof result.candidateSha256 !== 'string' || !result.candidatePayloadBase64) {
      throw new Error('candidate_payload_missing');
    }
    const id = candidateId(result);
    if (seen.has(id)) throw new Error('duplicate_candidate');
    seen.add(id);
    const disposition = result.report?.disposition ?? result.error?.code ?? 'unknown';
    let contributor = null;
    try {
      contributor = JSON.parse(Buffer.from(result.candidatePayloadBase64, 'base64').toString('utf8'))
        ?.provenance?.contributor ?? null;
    } catch {}
    const eligible = ['new_problem', 'improves_record'].includes(disposition);
    return {
      candidateId: id,
      candidateSha256: result.candidateSha256,
      candidatePayloadBase64: result.candidatePayloadBase64,
      sourcePath: result.path,
      disposition,
      state: eligible ? 'quarantined_for_review' : 'rejected_automatically',
      scientificReviewRequired: result.report?.humanReviewRequired === true,
      contributor,
      incumbentIndexDigest: result.report?.comparison?.incumbentIndexDigest ?? null,
      automatedEvidenceSha256: digestObject(result.report ?? result.error ?? null),
      events: []
    };
  });
  return seal({
    format: CONTRIBUTION_LEDGER_FORMAT,
    issuedAt,
    submissionAttestationSha256: bundle.attestation.sha256,
    incumbentIndexDigest: bundle.attestation.incumbentIndexDigest,
    incumbentSnapshotSha256: snapshotDigest,
    entries
  });
}

export function createEmptyContributionLedger(issuedAt) {
  if (!validIsoDate(issuedAt)) throw new TypeError('issuedAt must be an ISO date');
  return seal({
    format: CONTRIBUTION_LEDGER_FORMAT,
    issuedAt,
    submissionAttestationSha256: null,
    incumbentIndexDigest: null,
    incumbentSnapshotSha256: null,
    entries: []
  });
}

export function verifyContributionLedger(ledger) {
  const errors = [];
  if (ledger?.format !== CONTRIBUTION_LEDGER_FORMAT || !validIsoDate(ledger?.issuedAt) ||
    !Array.isArray(ledger?.entries)) errors.push('ledger_shape_invalid');
  const statement = ledger && typeof ledger === 'object'
    ? Object.fromEntries(Object.entries(ledger).filter(([key]) => key !== 'sha256'))
    : null;
  if (!statement || digestObject(statement) !== ledger?.sha256) errors.push('ledger_digest_mismatch');
  const ids = new Set();
  for (const entry of ledger?.entries ?? []) {
    if (ids.has(entry.candidateId)) errors.push(`duplicate_candidate:${entry.candidateId}`);
    ids.add(entry.candidateId);
    let previous = null;
    for (const event of entry.events ?? []) {
      const eventStatement = Object.fromEntries(Object.entries(event).filter(([key]) => key !== 'sha256'));
      if (event.previousSha256 !== previous || digestObject(eventStatement) !== event.sha256) {
        errors.push(`event_chain_invalid:${entry.candidateId}`);
      }
      previous = event.sha256;
    }
  }
  return { valid: errors.length === 0, errors, entries: ledger?.entries?.length ?? 0 };
}

export function recordContributionReview(ledger, review, authorityRegistry = null) {
  const verification = verifyContributionLedger(ledger);
  if (!verification.valid) throw new Error(`invalid_ledger:${verification.errors.join(',')}`);
  if (!review || typeof review.reviewer !== 'string' || review.reviewer.trim().length < 2 ||
    !validIsoDate(review.decidedAt) || !['approve', 'reject'].includes(review.decision)) {
    throw new TypeError('Review requires reviewer, decidedAt, and approve or reject');
  }
  const next = structuredClone(ledger);
  delete next.sha256;
  const entry = next.entries.find(item => item.candidateId === review.candidateId);
  if (!entry || entry.state !== 'quarantined_for_review') throw new Error('candidate_not_reviewable');
  if (entry.scientificReviewRequired && review.decision === 'approve' && review.scientificReview !== true) {
    throw new Error('scientific_review_required');
  }
  const metadata = review.canonicalMetadata;
  if (review.decision === 'approve' && (!metadata || typeof metadata.family !== 'string' ||
    typeof metadata.pattern !== 'string' || metadata.family.trim().length === 0 ||
    metadata.pattern.trim().length === 0 || !metadata.parameters ||
    typeof metadata.parameters !== 'object' || Array.isArray(metadata.parameters))) {
    throw new Error('canonical_metadata_required');
  }
  const previousSha256 = entry.events.at(-1)?.sha256 ?? null;
  let authorization;
  if (review.signature || authorityRegistry) {
    authorization = authorizeReview(authorityRegistry, ledger, entry, review);
    if (!authorization.valid) throw new Error(`review_unauthorized:${authorization.errors.join(',')}`);
  } else if (review.allowUnsignedMigration === true &&
    Date.parse(ledger.issuedAt) < Date.parse(UNSIGNED_MIGRATION_CUTOFF) &&
    entry.scientificReviewRequired !== true) {
    authorization = { valid: true, statement: null, key: null };
  } else {
    throw new Error('signed_review_required');
  }
  const event = {
    type: 'maintainer_review',
    reviewer: review.reviewer.trim(),
    decidedAt: review.decidedAt,
    decision: review.decision,
    reason: typeof review.reason === 'string' ? review.reason.trim() : '',
    scientificReview: review.scientificReview === true,
    canonicalMetadata: review.decision === 'approve' ? {
      family: metadata.family.trim(),
      pattern: metadata.pattern.trim(),
      parameters: structuredClone(metadata.parameters)
    } : null,
    authorization: authorization.statement ? {
      mode: 'ed25519', keyId: review.keyId, authoritySha256: authorityRegistry.sha256,
      ledgerSha256: ledger.sha256, signature: review.signature
    } : { mode: 'unsigned_migration', cutoff: UNSIGNED_MIGRATION_CUTOFF },
    previousSha256
  };
  entry.events.push({ ...event, sha256: digestObject(event) });
  if (review.decision === 'reject') entry.state = 'rejected_by_review';
  else {
    const distinctApprovers = new Set(entry.events
      .filter(item => item.decision === 'approve').map(item => item.reviewer.toLowerCase()));
    const quorum = entry.scientificReviewRequired ? 2 : 1;
    entry.state = distinctApprovers.size >= quorum ? 'approved_for_promotion' : 'quarantined_for_review';
  }
  return seal(next);
}

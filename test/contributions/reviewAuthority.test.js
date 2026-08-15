import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, generateKeyPairSync } from 'node:crypto';
import { createSubmissionAttestation } from '../../src/atlas/attestation.js';
import { createContributionLedger, recordContributionReview } from '../../src/contributions/ledger.js';
import {
  REVIEW_AUTHORITY_FORMAT, reviewSigningStatement, sealReviewAuthority, signReviewStatement
  , updateReviewAuthority, verifyReviewAuthority
} from '../../src/contributions/reviewAuthority.js';

const metadata = { family: 'isosceles', pattern: 'reviewed pattern', parameters: { apexAngle: 60 } };

function fixture({ scientific = false, contributor = 'Researcher' } = {}) {
  const payload = JSON.stringify({ provenance: { contributor } });
  const results = [{
    path: 'candidate.json', candidateSha256: 'a'.repeat(64),
    candidatePayloadBase64: Buffer.from(payload).toString('base64'),
    report: { disposition: 'improves_record', humanReviewRequired: scientific,
      comparison: { incumbentIndexDigest: 'b'.repeat(64) } }
  }];
  const incumbentSnapshot = [];
  const bundle = { format: 'triangle-packing-submission-batch/v1', incumbentSnapshot, results,
    attestation: createSubmissionAttestation('b'.repeat(64), results, incumbentSnapshot) };
  return createContributionLedger(bundle, '2026-08-15T09:00:00.000Z');
}

function identity(reviewer, roles = ['reviewer']) {
  const { publicKey, privateKey } = generateKeyPairSync('ed25519');
  return {
    privateKey: privateKey.export({ type: 'pkcs8', format: 'pem' }),
    key: { keyId: `${reviewer}-2026`, reviewer, roles,
      activeFrom: '2026-08-15T00:00:00.000Z', expiresAt: '2027-08-15T00:00:00.000Z',
      revokedAt: null, publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }) }
  };
}

function registry(...identities) {
  return sealReviewAuthority({ format: REVIEW_AUTHORITY_FORMAT,
    updatedAt: '2026-08-15T08:00:00.000Z', keys: identities.map(item => item.key) });
}

function signedReview(ledger, identity, overrides = {}) {
  const review = { candidateId: ledger.entries[0].candidateId, reviewer: identity.key.reviewer,
    keyId: identity.key.keyId, decidedAt: '2026-08-15T10:00:00.000Z', decision: 'approve',
    canonicalMetadata: metadata, ...overrides };
  review.signature = signReviewStatement(reviewSigningStatement(ledger, ledger.entries[0], review),
    identity.privateKey);
  return review;
}

test('accepts an authorized Ed25519 review and rejects a forged signature', () => {
  const reviewer = identity('reviewer-1');
  const authority = registry(reviewer);
  const ledger = fixture();
  const approved = recordContributionReview(ledger, signedReview(ledger, reviewer), authority);
  assert.equal(approved.entries[0].state, 'approved_for_promotion');
  const forged = signedReview(ledger, reviewer);
  forged.signature = `${forged.signature.slice(0, -2)}AA`;
  assert.throws(() => recordContributionReview(ledger, forged, authority), /review_signature_invalid/);
});

test('fails closed for inactive, revoked, and wrong-scope reviewer keys', () => {
  const expired = identity('expired');
  expired.key.expiresAt = '2026-08-15T09:30:00.000Z';
  assert.throws(() => recordContributionReview(fixture(), signedReview(fixture(), expired), registry(expired)),
    /review_key_inactive/);
  const revoked = identity('revoked');
  revoked.key.revokedAt = '2026-08-15T09:30:00.000Z';
  assert.throws(() => recordContributionReview(fixture(), signedReview(fixture(), revoked), registry(revoked)),
    /review_key_revoked/);
  const ordinary = identity('ordinary');
  const ledger = fixture({ scientific: true });
  assert.throws(() => recordContributionReview(ledger,
    signedReview(ledger, ordinary, { scientificReview: true }), registry(ordinary)), /review_key_scope_invalid/);
});

test('requires two distinct authorized proof reviewers and forbids self-review', () => {
  const first = identity('proof-1', ['proof_reviewer']);
  const second = identity('proof-2', ['proof_reviewer']);
  const authority = registry(first, second);
  const ledger = fixture({ scientific: true });
  const once = recordContributionReview(ledger,
    signedReview(ledger, first, { scientificReview: true }), authority);
  assert.equal(once.entries[0].state, 'quarantined_for_review');
  const twice = recordContributionReview(once,
    signedReview(once, second, { scientificReview: true }), authority);
  assert.equal(twice.entries[0].state, 'approved_for_promotion');
  const self = fixture({ scientific: true, contributor: 'proof-1' });
  assert.throws(() => recordContributionReview(self,
    signedReview(self, first, { scientificReview: true }), authority), /scientific_self_review_forbidden/);
});

test('unsigned migration is explicit, time-bounded, and never permits scientific claims', () => {
  const old = fixture();
  old.issuedAt = '2026-08-15T07:59:00.000Z';
  const statement = Object.fromEntries(Object.entries(old).filter(([key]) => key !== 'sha256'));
  old.sha256 = createHash('sha256').update(JSON.stringify(statement)).digest('hex');
  assert.doesNotThrow(() => recordContributionReview(old, { candidateId: old.entries[0].candidateId,
    reviewer: 'legacy-reviewer', decidedAt: '2026-08-15T07:59:30.000Z', decision: 'approve',
    canonicalMetadata: metadata, allowUnsignedMigration: true }));
  const scientific = fixture({ scientific: true });
  assert.throws(() => recordContributionReview(scientific, { candidateId: scientific.entries[0].candidateId,
    reviewer: 'legacy-reviewer', decidedAt: '2026-08-15T10:00:00.000Z', decision: 'approve',
    scientificReview: true, canonicalMetadata: metadata, allowUnsignedMigration: true }),
  /signed_review_required/);
});

test('key additions and revocations are deterministic, ordered, and public-only', () => {
  const first = identity('z-reviewer');
  const second = identity('a-reviewer');
  const initial = registry(first);
  const change = { action: 'add', updatedAt: '2026-08-16T00:00:00.000Z', key: second.key };
  const rotated = updateReviewAuthority(initial, change);
  assert.deepEqual(rotated, updateReviewAuthority(initial, change));
  assert.deepEqual(rotated.keys.map(key => key.keyId), ['a-reviewer-2026', 'z-reviewer-2026']);
  assert.equal(verifyReviewAuthority(rotated).valid, true);
  const revoked = updateReviewAuthority(rotated, { action: 'revoke', keyId: first.key.keyId,
    updatedAt: '2026-08-17T00:00:00.000Z', revokedAt: '2026-08-17T00:00:00.000Z' });
  assert.equal(revoked.keys.find(key => key.keyId === first.key.keyId).revokedAt,
    '2026-08-17T00:00:00.000Z');
  assert.throws(() => updateReviewAuthority(initial, { ...change,
    key: { ...second.key, privateKeyPem: second.privateKey } }), /authority_key_add_invalid/);
});

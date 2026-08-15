import { createHash, createPublicKey, sign, verify } from 'node:crypto';

export const REVIEW_AUTHORITY_FORMAT = 'triangle-packing-review-authority/v1';
export const REVIEW_SIGNATURE_DOMAIN = 'triangle-packing-review-event/v1';
export const UNSIGNED_MIGRATION_CUTOFF = '2026-08-15T08:00:00.000Z';

const digestObject = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');
const validDate = value => typeof value === 'string' && Number.isFinite(Date.parse(value));

export function sealReviewAuthority(statement) {
  return { ...statement, sha256: digestObject(statement) };
}

export function verifyReviewAuthority(registry) {
  const errors = [];
  const statement = registry && typeof registry === 'object'
    ? Object.fromEntries(Object.entries(registry).filter(([key]) => key !== 'sha256'))
    : null;
  if (registry?.format !== REVIEW_AUTHORITY_FORMAT || !Array.isArray(registry?.keys) ||
    !validDate(registry?.updatedAt)) errors.push('authority_shape_invalid');
  if (!statement || digestObject(statement) !== registry?.sha256) errors.push('authority_digest_mismatch');
  const ids = new Set();
  for (const key of registry?.keys ?? []) {
    if (typeof key.keyId !== 'string' || ids.has(key.keyId)) errors.push(`authority_key_id_invalid:${key.keyId}`);
    ids.add(key.keyId);
    if (typeof key.reviewer !== 'string' || !Array.isArray(key.roles) ||
      !key.roles.every(role => ['reviewer', 'proof_reviewer', 'maintainer'].includes(role)) ||
      !validDate(key.activeFrom) || !validDate(key.expiresAt) || key.activeFrom >= key.expiresAt) {
      errors.push(`authority_key_metadata_invalid:${key.keyId}`);
    }
    try { createPublicKey(key.publicKeyPem); } catch { errors.push(`authority_public_key_invalid:${key.keyId}`); }
    if (key.revokedAt !== null && !validDate(key.revokedAt)) errors.push(`authority_revocation_invalid:${key.keyId}`);
  }
  return { valid: errors.length === 0, errors, keys: registry?.keys?.length ?? 0 };
}

export function updateReviewAuthority(registry, change) {
  const verification = verifyReviewAuthority(registry);
  if (!verification.valid) throw new Error(`invalid_review_authority:${verification.errors.join(',')}`);
  if (!change || !validDate(change.updatedAt) ||
    Date.parse(change.updatedAt) <= Date.parse(registry.updatedAt)) {
    throw new Error('authority_update_time_invalid');
  }
  const next = structuredClone(registry);
  delete next.sha256;
  next.updatedAt = change.updatedAt;
  if (change.action === 'add') {
    const key = structuredClone(change.key);
    if (!key || Object.keys(key).some(name => /private/i.test(name)) ||
      next.keys.some(item => item.keyId === key.keyId)) throw new Error('authority_key_add_invalid');
    const candidate = sealReviewAuthority({ ...next, keys: [...next.keys, key]
      .sort((left, right) => left.keyId.localeCompare(right.keyId)) });
    const result = verifyReviewAuthority(candidate);
    if (!result.valid) throw new Error(`authority_key_add_invalid:${result.errors.join(',')}`);
    return candidate;
  }
  if (change.action === 'revoke') {
    const key = next.keys.find(item => item.keyId === change.keyId);
    if (!key || key.revokedAt !== null || !validDate(change.revokedAt) ||
      change.revokedAt !== change.updatedAt ||
      Date.parse(change.revokedAt) < Date.parse(key.activeFrom)) {
      throw new Error('authority_key_revoke_invalid');
    }
    key.revokedAt = change.revokedAt;
    return sealReviewAuthority(next);
  }
  throw new Error('authority_action_invalid');
}

export function reviewSigningStatement(ledger, entry, review) {
  return {
    domain: REVIEW_SIGNATURE_DOMAIN,
    ledgerSha256: ledger.sha256,
    candidateId: entry.candidateId,
    candidateSha256: entry.candidateSha256,
    previousEventSha256: entry.events.at(-1)?.sha256 ?? null,
    reviewer: review.reviewer.trim(),
    keyId: review.keyId,
    decidedAt: review.decidedAt,
    decision: review.decision,
    reason: typeof review.reason === 'string' ? review.reason.trim() : '',
    scientificReview: review.scientificReview === true,
    canonicalMetadata: review.decision === 'approve' ? review.canonicalMetadata : null
  };
}

export function signReviewStatement(statement, privateKeyPem) {
  return sign(null, Buffer.from(JSON.stringify(statement)), privateKeyPem).toString('base64');
}

export function authorizeReview(registry, ledger, entry, review) {
  const authority = verifyReviewAuthority(registry);
  if (!authority.valid) return { valid: false, errors: authority.errors, statement: null };
  const key = registry.keys.find(item => item.keyId === review.keyId);
  const errors = [];
  if (!key || key.reviewer !== review.reviewer.trim()) errors.push('review_key_identity_mismatch');
  const decided = Date.parse(review.decidedAt);
  if (key && (decided < Date.parse(key.activeFrom) || decided >= Date.parse(key.expiresAt))) {
    errors.push('review_key_inactive');
  }
  if (key?.revokedAt && decided >= Date.parse(key.revokedAt)) errors.push('review_key_revoked');
  const requiredRole = entry.scientificReviewRequired ? 'proof_reviewer' : 'reviewer';
  if (key && !key.roles.includes(requiredRole) && !key.roles.includes('maintainer')) {
    errors.push('review_key_scope_invalid');
  }
  if (entry.scientificReviewRequired &&
    entry.contributor?.trim().toLowerCase() === review.reviewer.trim().toLowerCase()) {
    errors.push('scientific_self_review_forbidden');
  }
  const statement = reviewSigningStatement(ledger, entry, review);
  if (key && typeof review.signature === 'string') {
    if (!verify(null, Buffer.from(JSON.stringify(statement)), key.publicKeyPem,
      Buffer.from(review.signature, 'base64'))) errors.push('review_signature_invalid');
  } else errors.push('review_signature_missing');
  return { valid: errors.length === 0, errors, statement, key };
}

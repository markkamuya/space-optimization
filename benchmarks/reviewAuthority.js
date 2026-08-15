import { generateKeyPairSync } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import {
  authorizeReview, REVIEW_AUTHORITY_FORMAT, reviewSigningStatement,
  sealReviewAuthority, signReviewStatement
} from '../src/contributions/reviewAuthority.js';

const { publicKey, privateKey } = generateKeyPairSync('ed25519');
const key = { keyId: 'benchmark-reviewer-2026', reviewer: 'benchmark-reviewer', roles: ['reviewer'],
  activeFrom: '2026-01-01T00:00:00.000Z', expiresAt: '2027-01-01T00:00:00.000Z',
  revokedAt: null, publicKeyPem: publicKey.export({ type: 'spki', format: 'pem' }) };
const authority = sealReviewAuthority({ format: REVIEW_AUTHORITY_FORMAT,
  updatedAt: '2026-01-01T00:00:00.000Z', keys: [key] });
const entry = { candidateId: 'candidate-benchmark', candidateSha256: 'a'.repeat(64),
  scientificReviewRequired: false, contributor: 'contributor', events: [] };
const ledger = { sha256: 'b'.repeat(64) };
const review = { candidateId: entry.candidateId, reviewer: key.reviewer, keyId: key.keyId,
  decidedAt: '2026-08-15T10:00:00.000Z', decision: 'approve', reason: 'benchmark',
  canonicalMetadata: { family: 'benchmark', pattern: 'benchmark', parameters: {} } };
review.signature = signReviewStatement(reviewSigningStatement(ledger, entry, review), privateKey);

const iterations = 2_000;
const started = performance.now();
for (let index = 0; index < iterations; index += 1) {
  const result = authorizeReview(authority, ledger, entry, review);
  if (!result.valid) throw new Error(result.errors.join(','));
}
const elapsedMs = performance.now() - started;
const result = { iterations, elapsedMs: Number(elapsedMs.toFixed(2)),
  verificationsPerSecond: Math.round(iterations / (elapsedMs / 1000)) };
console.log(JSON.stringify(result, null, 2));
if (result.verificationsPerSecond < 500) throw new Error('review_authority_benchmark_regression');

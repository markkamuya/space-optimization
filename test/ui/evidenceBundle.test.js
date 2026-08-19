import assert from 'node:assert/strict';
import test from 'node:test';
import { createEvidenceBundle, validateEvidenceBundle } from '../../src/ui/evidenceBundle.js';

const record = {
  id: 'iso-a50-r1p95',
  verification: { certificate: 'sha256:certificate', fingerprint: 'tpa1-record' },
  reproducibility: { command: 'npm run atlas:experiment -- --record iso-a50-r1p95', seed: 'seed-1' },
  solution: { placements: [{ x: 1, y: 2 }] }
};
const release = { version: '2.0.0', releasedAt: '2026-07-26T00:00:00.000Z' };
const integrity = { algorithm: 'SHA-256', artifact: 'atlas-v2-shards.json', digest: 'a'.repeat(64), scope: 'index and shards' };
const source = 'verified_shards';

test('creates a record-specific evidence package with trusted release identity', () => {
  const bundle = createEvidenceBundle(record, release, integrity, source);
  assert.equal(bundle.format, 'triangle-packing-atlas-record-evidence/v1');
  assert.equal(bundle.record, record);
  assert.equal(bundle.release.integrity.digest, integrity.digest);
  assert.equal(bundle.release.source, source);
  assert.match(bundle.exportedAt, /^\d{4}-\d{2}-\d{2}T/);
});

test('validates every identity layer of an unchanged package', () => {
  const bundle = createEvidenceBundle(record, release, integrity, source);
  assert.deepEqual(validateEvidenceBundle(bundle, record, release, integrity, source), { valid: true, issues: [] });
});

test('rejects forged, stale, and malformed evidence with specific recovery feedback', () => {
  const forged = structuredClone(createEvidenceBundle(record, release, integrity, source));
  forged.record.verification.fingerprint = 'forged';
  forged.release.integrity.digest = 'b'.repeat(64);
  const result = validateEvidenceBundle(forged, record, release, integrity, source);
  assert.equal(result.valid, false);
  assert.match(result.issues.join(' '), /fingerprint/i);
  assert.match(result.issues.join(' '), /integrity digest/i);
  assert.equal(validateEvidenceBundle(null, record, release, integrity, source).valid, false);
});

test('fails closed when the session has no verified release identity', () => {
  const bundle = createEvidenceBundle(record, release, integrity, source);
  const result = validateEvidenceBundle(bundle, record, release, null, source);
  assert.equal(result.valid, false);
  assert.match(result.issues.join(' '), /verified Atlas release is not available/i);
});

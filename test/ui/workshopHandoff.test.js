import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkshopReviewPacket, workshopReviewMarkdown } from '../../src/ui/workshopHandoff.js';

const bundle = {
  checksum: 'sha256:abc',
  candidate: { id: 'candidate-1' },
  baseline: { id: 'baseline-1', fingerprint: 'fp', utilization: 0.8 },
  release: { version: '2.0.0', digest: 'sha256:def' },
  handoff: { verifyCommand: 'npm run atlas:submission -- candidate-1.json' }
};
const validation = {
  eligibleForContribution: true,
  geometryValid: true,
  assessment: { disposition: 'improves_record' },
  comparison: { candidateUtilization: 0.81, baselineUtilization: 0.8, delta: 0.01 }
};

test('review packet binds an eligible candidate to its release and checksum', () => {
  const packet = createWorkshopReviewPacket(bundle, validation);
  assert.equal(packet.baseline.id, 'baseline-1');
  assert.equal(packet.workshopChecksum, 'sha256:abc');
  assert.equal(packet.localAssessment.difference, 0.01);
  assert.match(packet.boundary, /not publication, proof, independent verification, or maintainer approval/);
});

test('review markdown is deterministic, reproducible, and claim-bounded', () => {
  const packet = createWorkshopReviewPacket(bundle, validation);
  const first = workshopReviewMarkdown(packet);
  assert.equal(first, workshopReviewMarkdown(packet));
  assert.match(first, /npm run atlas:submission -- candidate-1\.json/);
  assert.match(first, /Local difference: 1\.000000%/);
  assert.match(first, /- \[ \] Request maintainer and independent verification/);
  assert.doesNotMatch(first, /proven improvement/i);
});

test('handoff fails closed for ineligible or unbound drafts', () => {
  assert.throws(() => createWorkshopReviewPacket(bundle, { ...validation, eligibleForContribution: false }), /eligible/);
  assert.throws(() => createWorkshopReviewPacket({ ...bundle, checksum: null }, validation), /checksummed/);
  assert.throws(() => workshopReviewMarkdown({ format: 'unknown' }), /supported/);
});

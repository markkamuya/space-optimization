import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkshopReviewPacket, resolveWorkshopChallenge, workshopGitHubSummary, workshopReviewMarkdown } from '../../src/ui/workshopHandoff.js';

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

test('challenge resolution requires exact record, fingerprint, status, and repository issue URL', () => {
  const baseline = { id: 'baseline-1', verification: { fingerprint: 'fp' } };
  const challenge = { challengeId: 'TPA-C01', recordId: 'baseline-1', status: 'open', baseline: { fingerprint: 'fp' }, issueUrl: 'https://github.com/markkamuya/space-optimization/issues/1' };
  assert.equal(resolveWorkshopChallenge([challenge], baseline).challengeId, 'TPA-C01');
  assert.equal(resolveWorkshopChallenge([{ ...challenge, status: 'closed' }], baseline), null);
  assert.equal(resolveWorkshopChallenge([{ ...challenge, baseline: { fingerprint: 'other' } }], baseline), null);
  assert.equal(resolveWorkshopChallenge([{ ...challenge, issueUrl: 'https://example.com/issues/1' }], baseline), null);
});

test('GitHub summary is bounded to review identity and never embeds candidate payload or contributor data', () => {
  const packet = createWorkshopReviewPacket(bundle, validation);
  const summary = workshopGitHubSummary(packet, { challengeId: 'TPA-C01' });
  assert.match(summary, /TPA-C01/);
  assert.match(summary, /Workshop checksum: sha256:abc/);
  assert.doesNotMatch(summary, /placements|contributor|coordinates/i);
  assert.ok(summary.length < 1200);
});

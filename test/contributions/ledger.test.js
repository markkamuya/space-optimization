import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { spawnSync } from 'node:child_process';
import { createSubmissionAttestation, incumbentSnapshotDigest } from '../../src/atlas/attestation.js';
import {
  createContributionLedger, recordContributionReview, verifyContributionLedger
} from '../../src/contributions/ledger.js';

function bundle(humanReviewRequired = false) {
  const incumbentSnapshot = [];
  const results = [{
    path: 'candidate.json', candidateSha256: 'a'.repeat(64),
    candidatePayloadBase64: Buffer.from('{}').toString('base64'),
    report: {
      disposition: 'improves_record', humanReviewRequired,
      comparison: { incumbentIndexDigest: 'b'.repeat(64) }
    }
  }];
  return {
    format: 'triangle-packing-submission-batch/v1', incumbentSnapshot, results,
    attestation: createSubmissionAttestation('b'.repeat(64), results, incumbentSnapshot)
  };
}

test('creates a deterministic quarantine ledger from attested evidence', () => {
  const first = createContributionLedger(bundle(), '2026-08-15T00:00:00.000Z');
  const second = createContributionLedger(bundle(), '2026-08-15T00:00:00.000Z');
  assert.deepEqual(first, second);
  assert.equal(first.incumbentSnapshotSha256, incumbentSnapshotDigest([]));
  assert.equal(first.entries[0].state, 'quarantined_for_review');
  assert.equal(verifyContributionLedger(first).valid, true);
});

test('review decisions form a tamper-evident event chain', () => {
  const ledger = createContributionLedger(bundle(), '2026-08-15T00:00:00.000Z');
  const reviewed = recordContributionReview(ledger, {
    candidateId: `candidate-${'a'.repeat(64)}`, reviewer: 'maintainer-1',
    decidedAt: '2026-08-15T00:05:00.000Z', decision: 'approve', reason: 'coordinates reviewed',
    canonicalMetadata: { family: 'isosceles', pattern: 'reviewed pattern', parameters: { apexAngle: 60 } }
  });
  assert.equal(reviewed.entries[0].state, 'approved_for_promotion');
  assert.equal(verifyContributionLedger(reviewed).valid, true);
  reviewed.entries[0].events[0].reviewer = 'forged';
  assert.equal(verifyContributionLedger(reviewed).valid, false);
});

test('scientific claims cannot be approved without explicit scientific review', () => {
  const ledger = createContributionLedger(bundle(true), '2026-08-15T00:00:00.000Z');
  assert.throws(() => recordContributionReview(ledger, {
    candidateId: `candidate-${'a'.repeat(64)}`, reviewer: 'maintainer-1',
    decidedAt: '2026-08-15T00:05:00.000Z', decision: 'approve',
    canonicalMetadata: { family: 'isosceles', pattern: 'reviewed pattern', parameters: { apexAngle: 60 } }
  }), /scientific_review_required/);
});

test('rejects altered submission attestations before quarantine', () => {
  const source = bundle();
  source.results[0].report.disposition = 'new_problem';
  assert.throws(() => createContributionLedger(source, '2026-08-15T00:00:00.000Z'),
    /submission_attestation_invalid/);
});

test('CLI writes and resumes the ledger atomically', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'tpa-contribution-ledger-'));
  const bundlePath = join(directory, 'bundle.json');
  const ledgerPath = join(directory, 'ledger.json');
  await writeFile(bundlePath, JSON.stringify(bundle()));
  const initialized = spawnSync(process.execPath, [
    'cli/contribution-ledger.js', 'init', bundlePath,
    '--at', '2026-08-15T00:00:00.000Z', '--output', ledgerPath
  ], { cwd: new URL('../..', import.meta.url), encoding: 'utf8' });
  assert.equal(initialized.status, 0, initialized.stderr);
  const ledger = JSON.parse(await readFile(ledgerPath, 'utf8'));
  const reviewed = spawnSync(process.execPath, [
    'cli/contribution-ledger.js', 'review', ledgerPath,
    '--candidate', ledger.entries[0].candidateId, '--reviewer', 'maintainer-1',
    '--at', '2026-08-15T00:05:00.000Z', '--decision', 'approve',
    '--metadata', JSON.stringify({ family: 'isosceles', pattern: 'reviewed pattern', parameters: { apexAngle: 60 } }),
    '--output', ledgerPath
  ], { cwd: new URL('../..', import.meta.url), encoding: 'utf8' });
  assert.equal(reviewed.status, 0, reviewed.stderr);
  assert.equal(JSON.parse(await readFile(ledgerPath, 'utf8')).entries[0].state,
    'approved_for_promotion');
});

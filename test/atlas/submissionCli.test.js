import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, readFile, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import { createSubmissionAttestation, verifySubmissionAttestation } from '../../src/atlas/attestation.js';

test('submission CLI reports every malformed input in a batch', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-submission-'));
  const invalid = join(directory, 'invalid.json');
  const missing = join(directory, 'missing.json');
  await writeFile(invalid, '{');
  const result = spawnSync(process.execPath, ['cli/submission.js', invalid, missing], {
    cwd: new URL('../..', import.meta.url),
    encoding: 'utf8',
    timeout: 120_000
  });
  assert.equal(result.status, 1);
  const batch = JSON.parse(result.stdout);
  assert.equal(batch.format, 'triangle-packing-submission-batch/v1');
  assert.deepEqual(batch.results.map(report => report.error.code), [
    'INVALID_JSON',
    'UNREADABLE_SUBMISSION'
  ]);
  assert.equal(verifySubmissionAttestation(batch.attestation, batch.results), true);
});

test('submission CLI atomically writes a portable batch bundle', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-bundle-'));
  const invalid = join(directory, 'invalid.json');
  const bundlePath = join(directory, 'bundle.json');
  await writeFile(invalid, '{');
  const result = spawnSync(process.execPath, ['cli/submission.js', invalid, '--output', bundlePath], {
    cwd: new URL('../..', import.meta.url), encoding: 'utf8', timeout: 120_000
  });
  assert.equal(result.status, 1);
  const bundle = JSON.parse(await readFile(bundlePath, 'utf8'));
  assert.equal(bundle.format, 'triangle-packing-submission-batch/v1');
  assert.equal(verifySubmissionAttestation(bundle.attestation, bundle.results), true);
});

test('submission attestations are deterministic and outcome-bound', () => {
  const results = [{ path: 'candidate.json', candidateSha256: 'a'.repeat(64), report: {
    disposition: 'improves_record', comparison: { incumbentIndexDigest: 'b'.repeat(64) }
  } }];
  const first = createSubmissionAttestation('b'.repeat(64), results);
  const second = createSubmissionAttestation('b'.repeat(64), structuredClone(results));
  assert.deepEqual(first, second);
  assert.equal(verifySubmissionAttestation(first, results), true);
  results[0].report.disposition = 'reject_inferior';
  assert.equal(verifySubmissionAttestation(first, results), false);
});

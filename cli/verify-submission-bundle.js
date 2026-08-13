#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { candidatePayloadDigest, verifySubmissionAttestation } from '../src/atlas/attestation.js';
import { loadPublishedIncumbentIndex, queryVerifiedIncumbentIndex } from '../src/atlas/published.js';
import { assessSubmission } from '../src/atlas/submission.js';

const path = process.argv[2];
if (!path) throw new Error('Usage: npm run atlas:submission-verify -- bundle.json');
const bundle = JSON.parse(await readFile(path, 'utf8'));
const index = await loadPublishedIncumbentIndex();
const digest = queryVerifiedIncumbentIndex(index, null, null).sourceDigest;
const errors = [];
if (bundle.format !== 'triangle-packing-submission-batch/v1') errors.push('INVALID_BUNDLE_FORMAT');
if (bundle.attestation?.incumbentIndexDigest !== digest) errors.push('INCUMBENT_DIGEST_MISMATCH');
if (!verifySubmissionAttestation(bundle.attestation, bundle.results ?? [])) errors.push('ATTESTATION_INVALID');
for (const result of bundle.results ?? []) {
  if (result.candidateSha256) {
    try {
      const payload = result.candidatePayloadBase64 === undefined
        ? await readFile(result.path, 'utf8')
        : Buffer.from(result.candidatePayloadBase64, 'base64').toString('utf8');
      if (candidatePayloadDigest(payload) !== result.candidateSha256) errors.push(`CANDIDATE_DRIFT:${result.path}`);
      try {
        const replayedReport = assessSubmission(JSON.parse(payload), index);
        if (JSON.stringify(replayedReport) !== JSON.stringify(result.report)) {
          errors.push(`DECISION_REPLAY_MISMATCH:${result.path}`);
        }
      } catch (error) {
        if (result.error?.code !== 'INVALID_JSON' || !(error instanceof SyntaxError)) {
          errors.push(`ERROR_REPLAY_MISMATCH:${result.path}`);
        }
      }
    } catch {
      errors.push(`CANDIDATE_UNREADABLE:${result.path}`);
    }
  }
}
console.log(JSON.stringify({ valid: errors.length === 0, incumbentIndexDigest: digest, errors }, null, 2));
if (errors.length > 0) process.exitCode = 1;

#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { assessSubmission } from '../src/atlas/submission.js';
import { loadPublishedIncumbentIndex } from '../src/atlas/published.js';
import { candidatePayloadDigest, createSubmissionAttestation } from '../src/atlas/attestation.js';
import { queryVerifiedIncumbentIndex } from '../src/atlas/published.js';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('Usage: npm run atlas:submission -- path/to/record.json [...]');
  process.exit(2);
}
const publishedRecords = await loadPublishedIncumbentIndex();
const results = [];
for (const path of paths) {
  try {
    const payload = await readFile(path, 'utf8');
    const candidate = JSON.parse(payload);
    const report = assessSubmission(candidate, publishedRecords);
    results.push({ path, candidateSha256: candidatePayloadDigest(payload), report });
    if (report.disposition.startsWith('reject_')) process.exitCode = 1;
  } catch (error) {
    results.push({
      path,
      error: {
        code: error instanceof SyntaxError ? 'INVALID_JSON' : 'UNREADABLE_SUBMISSION',
        message: error.message
      }
    });
    process.exitCode = 1;
  }
}
const incumbentIndexDigest = queryVerifiedIncumbentIndex(publishedRecords, null, null).sourceDigest;
console.log(JSON.stringify({
  format: 'triangle-packing-submission-batch/v1',
  results,
  attestation: createSubmissionAttestation(incumbentIndexDigest, results)
}, null, 2));

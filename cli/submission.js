#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import { assessSubmission } from '../src/atlas/submission.js';
import { loadPublishedIncumbentIndex, snapshotVerifiedIncumbentIndex } from '../src/atlas/published.js';
import { candidatePayloadDigest, createSubmissionAttestation } from '../src/atlas/attestation.js';
import { queryVerifiedIncumbentIndex } from '../src/atlas/published.js';

const args = process.argv.slice(2);
const outputIndex = args.indexOf('--output');
const output = outputIndex >= 0 ? args[outputIndex + 1] : null;
if (outputIndex >= 0) args.splice(outputIndex, 2);
const paths = args;
if (paths.length === 0) {
  console.error('Usage: npm run atlas:submission -- path/to/record.json [...]');
  process.exit(2);
}
const publishedRecords = await loadPublishedIncumbentIndex();
const results = [];
for (const path of paths) {
  let payload;
  try {
    payload = await readFile(path, 'utf8');
    const candidate = JSON.parse(payload);
    const report = assessSubmission(candidate, publishedRecords);
    results.push({
      path,
      candidateSha256: candidatePayloadDigest(payload),
      candidatePayloadBase64: Buffer.from(payload).toString('base64'),
      report
    });
    if (report.disposition.startsWith('reject_')) process.exitCode = 1;
  } catch (error) {
    results.push({
      path,
      ...(payload === undefined ? {} : {
        candidateSha256: candidatePayloadDigest(payload),
        candidatePayloadBase64: Buffer.from(payload).toString('base64')
      }),
      error: {
        code: error instanceof SyntaxError ? 'INVALID_JSON' : 'UNREADABLE_SUBMISSION',
        message: error.message
      }
    });
    process.exitCode = 1;
  }
}
const incumbentIndexDigest = queryVerifiedIncumbentIndex(publishedRecords, null, null).sourceDigest;
const incumbentSnapshot = output ? snapshotVerifiedIncumbentIndex(publishedRecords) : null;
const bundle = {
  format: 'triangle-packing-submission-batch/v1',
  ...(incumbentSnapshot === null ? {} : { incumbentSnapshot }),
  results,
  attestation: createSubmissionAttestation(incumbentIndexDigest, results, incumbentSnapshot)
};
const serialized = `${JSON.stringify(bundle, null, 2)}\n`;
if (output) {
  const temporary = `${output}.tmp-${process.pid}`;
  await writeFile(temporary, serialized);
  await rename(temporary, output);
}
console.log((output
  ? JSON.stringify({ ...bundle, incumbentSnapshot: undefined }, null, 2)
  : serialized).trimEnd());

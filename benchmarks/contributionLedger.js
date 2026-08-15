import { performance } from 'node:perf_hooks';
import { createSubmissionAttestation } from '../src/atlas/attestation.js';
import { createContributionLedger, verifyContributionLedger } from '../src/contributions/ledger.js';

const incumbentSnapshot = [];
const results = Array.from({ length: 100 }, (_, index) => ({
  path: `candidate-${index}.json`,
  candidateSha256: index.toString(16).padStart(64, '0'),
  candidatePayloadBase64: Buffer.from(`{"id":"candidate-${index}"}`).toString('base64'),
  report: {
    disposition: index % 5 === 0 ? 'reject_inferior' : 'improves_record',
    humanReviewRequired: false,
    comparison: { incumbentIndexDigest: 'b'.repeat(64) }
  }
}));
const bundle = {
  format: 'triangle-packing-submission-batch/v1', incumbentSnapshot, results,
  attestation: createSubmissionAttestation('b'.repeat(64), results, incumbentSnapshot)
};
const started = performance.now();
const ledger = createContributionLedger(bundle, '2026-08-15T00:00:00.000Z');
const verification = verifyContributionLedger(ledger);
const elapsedMs = performance.now() - started;
const report = {
  candidates: results.length,
  quarantined: ledger.entries.filter(entry => entry.state === 'quarantined_for_review').length,
  rejected: ledger.entries.filter(entry => entry.state === 'rejected_automatically').length,
  elapsedMs,
  valid: verification.valid
};
console.log(JSON.stringify(report, null, 2));
if (!report.valid || elapsedMs > 1000) process.exitCode = 1;

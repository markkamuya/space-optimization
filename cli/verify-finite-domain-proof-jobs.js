#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { verifyFiniteDomainProofJob } from '../src/research/proofJobs.js';

if (process.argv.length < 3) {
  console.error('Usage: verify-finite-domain-proof-jobs checkpoint-or-index.json [...]');
  process.exit(2);
}
const reports = [];
for (const path of process.argv.slice(2)) {
  try {
    const payload = JSON.parse(await readFile(path, 'utf8'));
    const jobs = payload.format === 'tpa-finite-domain-proof-jobs/v1'
      ? payload.jobs.map(entry => entry.checkpoint)
      : [payload];
    reports.push(...jobs.map((job, index) => ({ path, index, ...verifyFiniteDomainProofJob(job) })));
  } catch (error) {
    reports.push({ path, index: null, valid: false, errors: [`read_error:${error.code ?? error.name}`] });
  }
}
const report = {
  format: 'tpa-finite-domain-proof-job-batch-verification/v1',
  valid: reports.every(entry => entry.valid),
  jobs: reports.length,
  proofReady: reports.filter(entry => entry.stage === 'proof_ready').length,
  reports
};
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;

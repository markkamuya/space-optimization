#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import {
  advanceFiniteDomainProofJob,
  createFiniteDomainProofJob,
  verifyFiniteDomainProofJob
} from '../src/research/proofJobs.js';

const specificationPath = process.argv[2];
const checkpointPath = process.argv[3];
const stageArgument = process.argv.indexOf('--stop-after');
const targetStage = stageArgument >= 0 ? process.argv[stageArgument + 1] : 'proof_ready';
if (!specificationPath || !checkpointPath) {
  console.error('Usage: finite-domain-proof-job specification.json checkpoint.json [--stop-after domain_ready|graph_ready|proof_ready]');
  process.exit(2);
}
const specification = JSON.parse(await readFile(specificationPath, 'utf8'));
let job;
try {
  job = JSON.parse(await readFile(checkpointPath, 'utf8'));
  if (JSON.stringify(job.specification) !== JSON.stringify(specification)) throw new Error('checkpoint_specification_mismatch');
} catch (error) {
  if (error.code !== 'ENOENT') throw error;
  job = createFiniteDomainProofJob(specification);
}
const advanced = advanceFiniteDomainProofJob(job, targetStage);
const verification = verifyFiniteDomainProofJob(advanced);
if (!verification.valid) throw new Error(`generated_invalid_checkpoint:${verification.errors.join(',')}`);
const temporaryPath = `${checkpointPath}.${process.pid}.tmp`;
await writeFile(temporaryPath, `${JSON.stringify(advanced, null, 2)}\n`, { flag: 'wx' });
await rename(temporaryPath, checkpointPath);
console.log(JSON.stringify({ valid: true, stage: advanced.stage, sha256: advanced.sha256 }, null, 2));

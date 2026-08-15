#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import {
  createContributionLedger,
  recordContributionReview,
  verifyContributionLedger
} from '../src/contributions/ledger.js';
import { buildPromotionPlan, verifyPromotionPlan } from '../src/contributions/promotion.js';
import { loadPublishedRecords } from '../src/atlas/published.js';

const [command, source, ...args] = process.argv.slice(2);
const option = name => {
  const index = args.indexOf(name);
  return index < 0 ? undefined : args[index + 1];
};
const output = option('--output');

async function atomicWrite(path, value) {
  const temporary = `${path}.tmp-${process.pid}`;
  await writeFile(temporary, `${JSON.stringify(value, null, 2)}\n`);
  await rename(temporary, path);
}

let result;
if (command === 'init') {
  result = createContributionLedger(JSON.parse(await readFile(source, 'utf8')), option('--at'));
} else if (command === 'review') {
  const authorityPath = option('--authority');
  const authority = authorityPath ? JSON.parse(await readFile(authorityPath, 'utf8')) : null;
  result = recordContributionReview(JSON.parse(await readFile(source, 'utf8')), {
    candidateId: option('--candidate'), reviewer: option('--reviewer'), decidedAt: option('--at'),
    decision: option('--decision'), reason: option('--reason'),
    keyId: option('--key-id'), signature: option('--signature'),
    allowUnsignedMigration: args.includes('--allow-unsigned-migration'),
    scientificReview: args.includes('--scientific-review'),
    canonicalMetadata: option('--metadata') ? JSON.parse(option('--metadata')) : undefined
  }, authority);
} else if (command === 'verify') {
  result = verifyContributionLedger(JSON.parse(await readFile(source, 'utf8')));
  if (!result.valid) process.exitCode = 1;
} else if (command === 'plan') {
  const ledger = JSON.parse(await readFile(source, 'utf8'));
  result = buildPromotionPlan(ledger, await loadPublishedRecords(), option('--at'));
} else if (command === 'verify-plan') {
  const ledgerPath = option('--ledger');
  result = verifyPromotionPlan(JSON.parse(await readFile(source, 'utf8')),
    JSON.parse(await readFile(ledgerPath, 'utf8')));
  if (!result.valid) process.exitCode = 1;
} else {
  throw new Error('Usage: contribution-ledger <init|review|verify|plan|verify-plan> FILE [options]');
}
if (output) await atomicWrite(output, result);
console.log(JSON.stringify(result, null, 2));

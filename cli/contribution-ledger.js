#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import {
  createContributionLedger,
  recordContributionReview,
  verifyContributionLedger
} from '../src/contributions/ledger.js';

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
  result = recordContributionReview(JSON.parse(await readFile(source, 'utf8')), {
    candidateId: option('--candidate'), reviewer: option('--reviewer'), decidedAt: option('--at'),
    decision: option('--decision'), reason: option('--reason'),
    scientificReview: args.includes('--scientific-review')
  });
} else if (command === 'verify') {
  result = verifyContributionLedger(JSON.parse(await readFile(source, 'utf8')));
  if (!result.valid) process.exitCode = 1;
} else {
  throw new Error('Usage: contribution-ledger <init|review|verify> FILE [options]');
}
if (output) await atomicWrite(output, result);
console.log(JSON.stringify(result, null, 2));

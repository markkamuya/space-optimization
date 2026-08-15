import { readFile, writeFile } from 'node:fs/promises';
import { contributionStatus } from '../src/contributions/promotion.js';

const ledger = JSON.parse(await readFile(new URL('../contributions/ledger.json', import.meta.url), 'utf8'));
const authority = JSON.parse(await readFile(new URL('../review-authority/registry.json', import.meta.url), 'utf8'));
const status = contributionStatus(ledger, authority);
await writeFile(new URL('../public/contribution-status-v2.json', import.meta.url),
  `${JSON.stringify(status, null, 2)}\n`);
console.log(`Contribution status: ${Object.values(status.counts).reduce((sum, count) => sum + count, 0)} tracked candidates.`);

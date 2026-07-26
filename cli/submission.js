#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { ATLAS_RECORDS } from '../src/atlas/catalog.js';
import { assessSubmission } from '../src/atlas/submission.js';

const path = process.argv[2];
if (!path) {
  console.error('Usage: npm run atlas:submission -- path/to/record.json');
  process.exit(2);
}
const candidate = JSON.parse(await readFile(path, 'utf8'));
const report = assessSubmission(candidate, ATLAS_RECORDS);
console.log(JSON.stringify(report, null, 2));
if (report.disposition.startsWith('reject_')) process.exitCode = 1;

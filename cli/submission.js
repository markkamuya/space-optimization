#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { assessSubmission } from '../src/atlas/submission.js';
import { loadPublishedRecords } from '../src/atlas/published.js';

const path = process.argv[2];
if (!path) {
  console.error('Usage: npm run atlas:submission -- path/to/record.json');
  process.exit(2);
}
const candidate = JSON.parse(await readFile(path, 'utf8'));
const publishedRecords = await loadPublishedRecords();
const report = assessSubmission(candidate, publishedRecords);
console.log(JSON.stringify(report, null, 2));
if (report.disposition.startsWith('reject_')) process.exitCode = 1;

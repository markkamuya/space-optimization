#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { assessSubmission } from '../src/atlas/submission.js';
import { loadPublishedRecords } from '../src/atlas/published.js';

const paths = process.argv.slice(2);
if (paths.length === 0) {
  console.error('Usage: npm run atlas:submission -- path/to/record.json [...]');
  process.exit(2);
}
const publishedRecords = await loadPublishedRecords();
const results = [];
for (const path of paths) {
  try {
    const candidate = JSON.parse(await readFile(path, 'utf8'));
    const report = assessSubmission(candidate, publishedRecords);
    results.push({ path, report });
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
console.log(JSON.stringify(results, null, 2));

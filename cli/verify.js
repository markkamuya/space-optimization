#!/usr/bin/env node
import { readFile } from 'node:fs/promises';

import { verifyAtlasRecord } from '../src/atlas/verifier.js';

const path = process.argv[2];
if (!path) {
  console.error('Usage: npm run atlas:verify -- path/to/record.json');
  process.exitCode = 2;
} else {
  try {
    const record = JSON.parse(await readFile(path, 'utf8'));
    const report = verifyAtlasRecord(record);
    console.log(JSON.stringify(report, null, 2));
    if (!report.valid) process.exitCode = 1;
  } catch (error) {
    console.error(JSON.stringify({ valid: false, errors: [{ code: 'READ_ERROR', message: error.message }] }, null, 2));
    process.exitCode = 2;
  }
}

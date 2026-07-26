#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { verifyCertificate } from '../src/research/certificates.js';

const certificatePath = process.argv[2];
const recordPath = process.argv[3];
if (!certificatePath || !recordPath) {
  console.error('Usage: npm run atlas:certificate -- certificate.json record.json');
  process.exit(2);
}
const [certificate, record] = await Promise.all([
  readFile(certificatePath, 'utf8').then(JSON.parse),
  readFile(recordPath, 'utf8').then(JSON.parse)
]);
const report = verifyCertificate(certificate, record);
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;

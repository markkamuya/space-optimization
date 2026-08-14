#!/usr/bin/env node
import { readFile } from 'node:fs/promises';
import { verifyCertificate } from '../src/research/certificates.js';
import { verifyFiniteDomainProof } from '../src/research/finiteDomain.js';

const certificatePath = process.argv[2];
const recordPath = process.argv[3];
if (!certificatePath) {
  console.error('Usage: npm run atlas:certificate -- certificate.json [record.json]');
  process.exit(2);
}
const certificate = JSON.parse(await readFile(certificatePath, 'utf8'));
const report = certificate.format === 'triangle-packing-certificate/v3'
  ? verifyFiniteDomainProof(certificate)
  : verifyCertificate(certificate, JSON.parse(await readFile(recordPath, 'utf8')));
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;

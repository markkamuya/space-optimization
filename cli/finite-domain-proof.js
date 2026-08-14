#!/usr/bin/env node
import { readFile, rename, writeFile } from 'node:fs/promises';
import {
  buildFiniteConflictGraph, generateFiniteCandidateDomain, solveFiniteDomainCertificate,
  verifyFiniteDomainProof
} from '../src/research/finiteDomain.js';

const [inputPath, outputPath] = process.argv.slice(2);
if (!inputPath || !outputPath) {
  throw new Error('Usage: finite-domain-proof.js domain-specification.json certificate.json');
}
const input = JSON.parse(await readFile(inputPath, 'utf8'));
const domain = generateFiniteCandidateDomain(input.problem, input.specification, input.limits);
const graph = buildFiniteConflictGraph(domain, input.limits);
const certificate = solveFiniteDomainCertificate(domain, graph, input.limits);
const verification = verifyFiniteDomainProof(certificate, input.limits);
if (!verification.valid) throw new Error(`Generated proof failed replay: ${verification.errors.join(', ')}`);
const serialized = `${JSON.stringify(certificate, null, 2)}\n`;
const temporary = `${outputPath}.tmp-${process.pid}`;
await writeFile(temporary, serialized);
await rename(temporary, outputPath);
console.log(JSON.stringify({
  valid: true,
  candidateCount: domain.candidateCount,
  conflictEdges: graph.edgeCount,
  optimum: certificate.optimum,
  globallyOptimal: false,
  sha256: certificate.sha256
}, null, 2));

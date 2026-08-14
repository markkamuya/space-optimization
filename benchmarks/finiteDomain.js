import { performance } from 'node:perf_hooks';
import {
  buildFiniteConflictGraph, generateFiniteCandidateDomain, solveFiniteDomainCertificate,
  verifyFiniteDomainProof
} from '../src/research/finiteDomain.js';

const started = performance.now();
const domain = generateFiniteCandidateDomain(
  { width: 3, height: 2, sides: [1, 1, 1] },
  { xStep: 1, yStep: 1, angles: [0, Math.PI * 2], reflections: [false], quantum: 1e-9 }
);
const graph = buildFiniteConflictGraph(domain);
const certificate = solveFiniteDomainCertificate(domain, graph, { maxSearchNodes: 100_000 });
const verification = verifyFiniteDomainProof(certificate);
const wallTimeMs = performance.now() - started;
const report = {
  format: 'tpa-finite-domain-benchmark/v1',
  candidates: domain.candidateCount,
  conflictEdges: graph.edgeCount,
  optimum: certificate.optimum,
  independentSetNodes: certificate.solver.independentSetNodes,
  cliqueCoverNodes: certificate.solver.cliqueCoverNodes,
  wallTimeMs: Number(wallTimeMs.toFixed(2)),
  valid: verification.valid,
  globallyOptimal: verification.globallyOptimal,
  passes: verification.valid && verification.globallyOptimal === false && wallTimeMs < 1000
};
console.log(JSON.stringify(report, null, 2));
if (!report.passes) process.exitCode = 1;

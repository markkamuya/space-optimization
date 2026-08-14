import assert from 'node:assert/strict';
import test from 'node:test';
import { spawnSync } from 'node:child_process';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { tmpdir } from 'node:os';
import {
  buildFiniteConflictGraph, finiteDomainDigest, generateFiniteCandidateDomain,
  connectedConflictComponents, solveComponentAwareExact, solveFiniteDomainCertificate,
  solveMaximumIndependentSet, solveMaximumIndependentSetBitset, solveMinimumCliqueCover,
  verifyFiniteDomainProof
} from '../../src/research/finiteDomain.js';

const problem = { width: 2, height: 2, sides: [1, 1, 1] };
const specification = {
  xStep: 0.5,
  yStep: 0.5,
  angles: [0, Math.PI],
  reflections: [false],
  quantum: 1e-9
};

test('finite candidate domains are canonical, bounded, and byte-deterministic', () => {
  const first = generateFiniteCandidateDomain(problem, specification);
  const second = generateFiniteCandidateDomain(structuredClone(problem), structuredClone(specification));
  assert.deepEqual(first, second);
  assert.ok(first.candidateCount > 1);
  assert.equal(first.sha256, finiteDomainDigest(first.problem, first.specification, first.candidates));
  assert.deepEqual(first.candidates, [...first.candidates].sort((left, right) =>
    left.x - right.x || left.y - right.y || left.angle - right.angle || Number(left.reflect) - Number(right.reflect)));
});

test('component-aware bitset search composes exact witnesses deterministically', () => {
  const graph = { adjacency: [[1, 2], [0, 2], [0, 1], [4], [3], []] };
  assert.deepEqual(connectedConflictComponents(graph), [[0, 1, 2], [3, 4], [5]]);
  const direct = solveMaximumIndependentSetBitset(graph);
  assert.equal(direct.optimumLowerBound, 3);
  const first = solveComponentAwareExact(graph);
  const second = solveComponentAwareExact(structuredClone(graph));
  assert.deepEqual(first, second);
  assert.deepEqual(first.selectedIndices, [0, 3, 5]);
  assert.equal(first.cliqueCover.length, 3);
  assert.deepEqual(first.cliqueCover.flat().sort((a, b) => a - b), [0, 1, 2, 3, 4, 5]);
});

test('conflict graphs are symmetric, digest-bound, and deterministic', () => {
  const domain = generateFiniteCandidateDomain(problem, specification);
  const first = buildFiniteConflictGraph(domain);
  const second = buildFiniteConflictGraph(structuredClone(domain));
  assert.deepEqual(first, second);
  assert.ok(first.edgeCount > 0);
  first.adjacency.forEach((neighbors, left) => neighbors.forEach(right => {
    assert.ok(first.adjacency[right].includes(left));
  }));
  const tampered = structuredClone(domain);
  tampered.candidates[0].x += 0.5;
  assert.throws(() => buildFiniteConflictGraph(tampered), /candidate_domain_digest_mismatch/);
});

test('domain and graph resource limits fail closed', () => {
  assert.throws(() => generateFiniteCandidateDomain(problem, specification, { maxCandidates: 1 }), /candidate_limit_exceeded/);
  const domain = generateFiniteCandidateDomain(problem, specification);
  assert.throws(() => buildFiniteConflictGraph(domain, { maxConflictEdges: 1 }), /conflict_edge_limit_exceeded/);
});

test('exact solver meets independent-set and clique-cover bounds deterministically', () => {
  const domain = generateFiniteCandidateDomain(problem, {
    xStep: 1,
    yStep: 1,
    angles: [0, Math.PI * 2],
    reflections: [false],
    quantum: 1e-9
  });
  const graph = buildFiniteConflictGraph(domain);
  const independent = solveMaximumIndependentSet(graph);
  const cover = solveMinimumCliqueCover(graph, independent.optimumLowerBound);
  assert.equal(independent.optimumLowerBound, cover.optimumUpperBound);
  const first = solveFiniteDomainCertificate(domain, graph);
  const second = solveFiniteDomainCertificate(structuredClone(domain), structuredClone(graph));
  assert.deepEqual(first, second);
  assert.equal(verifyFiniteDomainProof(first).valid, true);
  assert.equal(first.globallyOptimal, false);
});

test('proof verification rejects graph, cover, claim, and digest tampering', () => {
  const domain = generateFiniteCandidateDomain(problem, {
    xStep: 1, yStep: 1, angles: [0, Math.PI * 2], reflections: [false], quantum: 1e-9
  });
  const certificate = solveFiniteDomainCertificate(domain, buildFiniteConflictGraph(domain));
  for (const mutate of [
    value => { value.domain.candidates[0].x += 1; },
    value => { value.cliqueCover[0].pop(); },
    value => { value.globallyOptimal = true; },
    value => { value.sha256 = '0'.repeat(64); }
  ]) {
    const tampered = structuredClone(certificate);
    mutate(tampered);
    assert.equal(verifyFiniteDomainProof(tampered).valid, false);
  }
});

test('exact search limits fail closed', () => {
  const domain = generateFiniteCandidateDomain(problem, specification);
  const graph = buildFiniteConflictGraph(domain);
  assert.throws(() => solveMaximumIndependentSet(graph, { maxSearchNodes: 1 }), /search_limit_exceeded/);
  assert.throws(() => solveMinimumCliqueCover(graph, graph.adjacency.length, { maxSearchNodes: 1 }), /search_limit_exceeded/);
});

test('independent Python verifier regenerates and accepts the exact proof', async () => {
  const domain = generateFiniteCandidateDomain(problem, {
    xStep: 1, yStep: 1, angles: [0, Math.PI * 2], reflections: [false], quantum: 1e-9
  });
  const certificate = solveFiniteDomainCertificate(domain, buildFiniteConflictGraph(domain));
  const directory = await mkdtemp(join(tmpdir(), 'tpa-finite-domain-'));
  const path = join(directory, 'certificate.json');
  await writeFile(path, `${JSON.stringify(certificate, null, 2)}\n`);
  const result = spawnSync('python3', ['independent_verifier/verify_finite_domain.py', path], {
    cwd: new URL('../..', import.meta.url), encoding: 'utf8', timeout: 30_000
  });
  assert.equal(result.status, 0, result.stderr || result.stdout);
  const report = JSON.parse(result.stdout);
  assert.equal(report.valid, true);
  assert.equal(report.optimum, certificate.optimum);
  assert.equal(report.globallyOptimal, false);
  const tampered = structuredClone(certificate);
  tampered.conflictGraph.adjacency[0] = [];
  await writeFile(path, `${JSON.stringify(tampered, null, 2)}\n`);
  const rejected = spawnSync('python3', ['independent_verifier/verify_finite_domain.py', path], {
    cwd: new URL('../..', import.meta.url), encoding: 'utf8', timeout: 30_000
  });
  assert.equal(rejected.status, 1);
  assert.ok(JSON.parse(rejected.stdout).errors.includes('conflict_graph_mismatch'));
});

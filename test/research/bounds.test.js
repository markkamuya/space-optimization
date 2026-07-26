import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProblem } from '../../src/core/problem.js';
import { homogeneousCountBound } from '../../src/research/bounds.js';
import { verifyFiniteDomainCertificate } from '../../src/research/certificates.js';

test('homogeneous area/count bound is rigorous and no larger than the area bound', () => {
  const problem = normalizeProblem({
    width: 2,
    height: 1,
    fillSheet: false,
    maxPieces: 1,
    triangles: [{ id: 'T', sides: [1, 1, 1] }]
  });
  const bound = homogeneousCountBound(problem);
  assert.equal(bound.rigorous, true);
  assert.equal(bound.maximumCount, 4);
  assert.ok(bound.utilization <= 1);
});

test('finite-domain clique certificate proves only its declared discrete scope', () => {
  const result = verifyFiniteDomainCertificate({
    type: 'finite_candidate_domain',
    problem: { width: 2, height: 2, sides: [1, 1, 1] },
    candidates: [
      { x: 0, y: 0, angle: 0, reflect: false },
      { x: 0, y: 0, angle: 0, reflect: false }
    ],
    selectedIndices: [0],
    cliqueCover: [[0, 1]]
  });
  assert.equal(result.valid, true);
  assert.equal(result.optimum, 1);
  assert.equal(result.globallyOptimal, false);
  assert.equal(result.scope, 'declared_finite_candidate_domain_only');
});

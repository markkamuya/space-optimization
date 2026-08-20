import assert from 'node:assert/strict';
import test from 'node:test';
import template from '../../atlas/submissions/template.json' with { type: 'json' };
import { preflightContribution } from '../../src/ui/submissionPreflight.js';

const baseline = structuredClone(template);
baseline.id = 'baseline-record';

test('complete candidate passes readiness checks without claiming geometric verification', () => {
  const report = preflightContribution(template, baseline);
  assert.equal(report.readyForFullVerification, true);
  assert.equal(report.checks.length, 6);
  assert.ok(report.checks.every(check => check.passed));
  assert.match(report.boundary, /does not verify geometry/i);
  assert.match(report.boundary, /maintainer review/i);
});

test('preflight reports attribution, reproducibility, coordinate, and baseline failures', () => {
  const candidate = structuredClone(template);
  candidate.problem.width += 1;
  candidate.solution.placements[0].x = null;
  candidate.provenance = { generator: 'solver', createdAt: candidate.provenance.createdAt, license: 'custom' };
  const report = preflightContribution(candidate, baseline);
  assert.equal(report.readyForFullVerification, false);
  const failed = new Set(report.checks.filter(check => !check.passed).map(check => check.id));
  for (const id of ['schema', 'baseline', 'coordinates', 'reproducibility', 'attribution']) assert.ok(failed.has(id), id);
});

test('malformed candidates fail closed without throwing', () => {
  const report = preflightContribution(null, baseline);
  assert.equal(report.readyForFullVerification, false);
  assert.ok(report.schemaErrors.length > 0);
});

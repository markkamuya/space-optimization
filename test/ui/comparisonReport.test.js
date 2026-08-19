import assert from 'node:assert/strict';
import test from 'node:test';
import release from '../../public/atlas-v2.json' with { type: 'json' };
import { comparisonReportSummary, createComparisonReport } from '../../src/ui/comparisonReport.js';

const left = release.records.find(record => record.id === 'iso-a90-r1p5');
const right = release.records.find(record => record.id === 'iso-a110-r3');
const integrity = { algorithm: 'SHA-256', artifact: 'atlas-v2-shards.json', digest: 'a'.repeat(64), scope: 'index and shards' };

test('comparison report carries exact evidence, bounds, reproduction, and release integrity', () => {
  const report = createComparisonReport(left, right, release, integrity, 'verified_shards');
  assert.equal(report.format, 'triangle-packing-atlas-comparison-report/v1');
  assert.equal(report.release.integrity.digest, integrity.digest);
  assert.equal(report.records.a.verification.certificate, left.verification.certificate);
  assert.equal(report.records.b.evidence.state, right.evidence.state);
  assert.equal(report.differences.utilization, right.verification.utilization - left.verification.utilization);
  assert.equal(report.cautions.length, 3);
});

test('plain-language summary preserves evidence distinctions and rejects proof inflation', () => {
  const summary = comparisonReportSummary(createComparisonReport(left, right, release, integrity, 'verified_shards'));
  assert.match(summary, /proven optimal/);
  assert.match(summary, /verified best known/);
  assert.match(summary, /does not by itself prove global optimality/i);
});

test('comparison export fails closed without a verified release digest', () => {
  assert.throws(() => createComparisonReport(left, right, release, null, 'verified_shards'), /verified_comparison_unavailable/);
});

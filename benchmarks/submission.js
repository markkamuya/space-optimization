import { performance } from 'node:perf_hooks';
import { ATLAS_RECORDS } from '../src/atlas/catalog.js';
import { assessSubmission } from '../src/atlas/submission.js';
import { buildVerifiedIncumbentIndex, loadPublishedRecords } from '../src/atlas/published.js';

const records = await loadPublishedRecords();
const index = buildVerifiedIncumbentIndex(records);
const source = ATLAS_RECORDS[0];
const candidate = {
  format: 'triangle-packing-atlas/v1',
  id: `${source.id}-benchmark`,
  problem: source.problem,
  solution: source.solution,
  evidence: { status: 'candidate' },
  provenance: {
    generator: 'benchmark', version: '1.0.0', seed: 'benchmark', runtimeMs: 0,
    contributor: 'Triangle Packing Atlas', license: 'CC-BY-4.0', createdAt: '2026-07-26T00:00:00.000Z'
  }
};

function measure(incumbents, iterations) {
  const start = performance.now();
  for (let iteration = 0; iteration < iterations; iteration += 1) {
    assessSubmission(candidate, incumbents);
  }
  return performance.now() - start;
}

measure(index, 5);
const iterations = 100;
const scannedMs = measure(records, iterations);
const indexedMs = measure(index, iterations);
const report = {
  format: 'triangle-packing-submission-benchmark/v1',
  incumbents: records.length,
  candidates: iterations,
  scannedMs: Number(scannedMs.toFixed(2)),
  indexedMs: Number(indexedMs.toFixed(2)),
  speedup: Number((scannedMs / indexedMs).toFixed(2)),
  incumbentIndexDigest: assessSubmission(candidate, index).comparison.incumbentIndexDigest,
  passes: indexedMs < scannedMs
};
console.log(JSON.stringify(report, null, 2));
if (!report.passes || !/^[0-9a-f]{64}$/.test(report.incumbentIndexDigest)) process.exitCode = 1;

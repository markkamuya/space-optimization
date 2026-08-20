import { performance } from 'node:perf_hooks';
import { boundedComparisonCandidates } from '../src/ui/comparisonFinder.js';

const patterns = ['vertical lattice', 'acute horizontal lattice', 'rectangular pairs', 'diagonal lattice'];
const records = Array.from({ length: 100_000 }, (_, index) => ({
  id: `synthetic-${index}`,
  experimentId: `isosceles/apex-${35 + index % 76}/rectangle-${(0.75 + (index % 16) * 0.15).toFixed(2)}`,
  family: index % 7 === 0 ? 'right' : 'isosceles',
  pattern: patterns[index % patterns.length],
  evidence: { state: index % 101 === 0 ? 'proven_optimal' : 'verified_best_known' },
  parameters: { apexAngle: 35 + index % 76, rectangleRatio: 0.75 + (index % 16) * 0.15 }
}));

const started = performance.now();
let rendered = 0;
let matches = 0;
for (const query of ['', 'right', 'acute 60', 'proven', 'rectangle-1.50']) {
  const result = boundedComparisonCandidates(records, query, 200);
  rendered = Math.max(rendered, result.visible.length);
  matches += result.total;
}
const durationMs = performance.now() - started;
const report = { records: records.length, queries: 5, maximumRenderedOptions: rendered, totalMatches: matches, durationMs: Number(durationMs.toFixed(2)), passes: rendered <= 200 && durationMs < 500 };
console.log(JSON.stringify(report));
if (!report.passes) process.exitCode = 1;

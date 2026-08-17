import release from '../public/atlas-v2.json' with { type: 'json' };
import { filterComparisonCandidates } from '../src/ui/comparisonFinder.js';

const queries = ['right 90 1.5', 'vertical', 'equilateral', 'proven_optimal', 'iso-a75-r2p4', 'not-a-real-record'];
const iterations = 1_000;
const started = performance.now();
let resultCount = 0;
for (let iteration = 0; iteration < iterations; iteration += 1) {
  for (const query of queries) resultCount += filterComparisonCandidates(release.records, query).length;
}
const elapsedMs = performance.now() - started;
const searches = iterations * queries.length;
const averageSearchMs = elapsedMs / searches;
const report = {
  format: 'triangle-packing-comparison-finder-benchmark/v1',
  records: release.records.length,
  searches,
  resultCount,
  elapsedMs: Number(elapsedMs.toFixed(2)),
  averageSearchMs: Number(averageSearchMs.toFixed(4)),
  maximumAverageSearchMs: 2,
  passes: averageSearchMs < 2
};
console.log(JSON.stringify(report, null, 2));
if (!report.passes) process.exitCode = 1;

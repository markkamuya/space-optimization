import atlas from '../public/atlas-v2.json' with { type: 'json' };
import { findWorkshopBaselines, WORKSHOP_BASELINE_LIMIT } from '../src/ui/workshopBaselineFinder.js';

const records = Array.from({ length: 100 }, (_, batch) => atlas.records.map(record => ({
  ...record,
  id: `${record.id}-scale-${batch}`,
  experimentId: `${record.experimentId}/scale-${batch}`
}))).flat();
const queries = ['isosceles 110 1.8', 'right 0.75', 'scalene 2.4', 'equilateral', 'missing'];
const started = performance.now();
let maximumRenderedOptions = 0;
for (let iteration = 0; iteration < 100; iteration += 1) {
  const result = findWorkshopBaselines(records, { query: queries[iteration % queries.length], currentId: records.at(-1).id });
  maximumRenderedOptions = Math.max(maximumRenderedOptions, result.records.length);
}
const durationMs = performance.now() - started;
const report = { records: records.length, searches: 100, maximumRenderedOptions, durationMs: Number(durationMs.toFixed(2)), passes: maximumRenderedOptions <= WORKSHOP_BASELINE_LIMIT && durationMs < 5000 };
console.log(JSON.stringify(report));
if (!report.passes) process.exitCode = 1;

import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import release from '../public/atlas-v2.json' with { type: 'json' };
import { buildResearchIndex, filterResearchIndex } from '../src/ui/researchIndex.js';

const scale = 100;
const records = Array.from({ length: scale }, (_, batch) => release.records.map(record => ({
  ...record,
  id: `${record.id}-scale-${batch}`,
  experimentId: `${record.experimentId}-scale-${batch}`
}))).flat();
const filters = { query: 'right 90 1.5', family: 'right', evidence: 'proven_optimal' };

const buildStarted = performance.now();
const index = buildResearchIndex(records);
const buildMs = performance.now() - buildStarted;

const iterations = 250;
const indexedStarted = performance.now();
let indexedMatches = 0;
for (let iteration = 0; iteration < iterations; iteration += 1) indexedMatches += filterResearchIndex(index, filters).length;
const indexedMs = performance.now() - indexedStarted;

const legacyStarted = performance.now();
let legacyMatches = 0;
for (let iteration = 0; iteration < iterations; iteration += 1) {
  legacyMatches += records.filter(record => {
    if (record.family !== filters.family || record.evidence.state !== filters.evidence) return false;
    const value = `${record.id} ${record.experimentId} ${record.family} ${record.pattern} ${record.evidence.state} ${record.parameters.apexAngle} ${record.parameters.rectangleRatio}`.toLowerCase();
    return filters.query.split(/\s+/).every(token => value.includes(token));
  }).length;
}
const legacyMs = performance.now() - legacyStarted;

assert.equal(indexedMatches, legacyMatches);
assert.ok(buildMs < 3000, `30,400-record index build took ${buildMs.toFixed(1)}ms`);
assert.ok(indexedMs < 1500, `250 indexed filter operations took ${indexedMs.toFixed(1)}ms`);
assert.ok(indexedMs < legacyMs, `Indexed filtering ${indexedMs.toFixed(1)}ms was not faster than ${legacyMs.toFixed(1)}ms legacy filtering`);
console.log(JSON.stringify({
  records: records.length,
  iterations,
  buildMs: Number(buildMs.toFixed(2)),
  indexedMs: Number(indexedMs.toFixed(2)),
  legacyMs: Number(legacyMs.toFixed(2)),
  speedup: Number((legacyMs / indexedMs).toFixed(2)),
  matchesPerQuery: indexedMatches / iterations
}));

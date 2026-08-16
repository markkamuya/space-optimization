import assert from 'node:assert/strict';
import { performance } from 'node:perf_hooks';
import { describePhaseSelection, phaseGridDestination } from '../src/ui/phaseGrid.js';

const sampleCount = 304;
const columns = 19;
const iterations = 1_000_000;
let index = 0;
const started = performance.now();
for (let iteration = 0; iteration < iterations; iteration += 1) {
  index = phaseGridDestination({
    key: iteration % 2 === 0 ? 'ArrowRight' : 'ArrowDown',
    index,
    columns,
    count: sampleCount
  });
}
for (let iteration = 0; iteration < sampleCount; iteration += 1) {
  const summary = describePhaseSelection({
    angle: 35 + iteration % 76,
    ratio: .75 + (iteration % columns) * .1,
    phase: { name: 'verified pattern', status: 'verified construction', utilization: .8 },
    nearestDistance: .01
  });
  assert.ok(summary.length > 100);
}
const durationMs = performance.now() - started;
assert.ok(durationMs < 500, `Accessible phase-grid operations took ${durationMs.toFixed(1)}ms`);
console.log(JSON.stringify({ sampleCount, navigationOperations: iterations, summaries: sampleCount, durationMs: Number(durationMs.toFixed(2)) }));

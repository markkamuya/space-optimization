import { performance } from 'node:perf_hooks';
import { findWorkshopPlacements, WORKSHOP_PLACEMENT_LIMIT } from '../src/ui/workshopPlacementFinder.js';

const placements = Array.from({ length: 300 }, (_, index) => ({
  x: (index * 0.137) % 14.4,
  y: (index * 0.223) % 8,
  angle: (index % 8) * Math.PI / 4
}));
const queries = ['', '300', 'x 4.11', 'y 3.568', 'angle 0'];
const started = performance.now();
let maximumRenderedOptions = 0;
for (let iteration = 0; iteration < 1000; iteration += 1) {
  const result = findWorkshopPlacements(placements, {
    query: queries[iteration % queries.length],
    currentIndex: iteration % placements.length
  });
  maximumRenderedOptions = Math.max(maximumRenderedOptions, result.placements.length);
}
const durationMs = performance.now() - started;
const report = {
  placements: placements.length,
  searches: 1000,
  maximumRenderedOptions,
  durationMs: Number(durationMs.toFixed(2)),
  passes: maximumRenderedOptions <= WORKSHOP_PLACEMENT_LIMIT && durationMs < 250
};
console.log(JSON.stringify(report));
if (!report.passes) process.exitCode = 1;

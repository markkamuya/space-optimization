import { performance } from 'node:perf_hooks';
import { RESEARCH_RECORDS } from '../src/research/dataset.js';
import { certifyPackingStability } from '../src/research/stability.js';

const started = performance.now();
const results = RESEARCH_RECORDS.map(record =>
  certifyPackingStability(record.problem, record.solution.placements));
const elapsedMs = performance.now() - started;
const classifications = Object.fromEntries([...Map.groupBy(results,
  item => item.classification)].map(([key, values]) => [key, values.length]));
console.log(JSON.stringify({ records: results.length, elapsedMs, classifications }, null, 2));
if (results.some(result => !result.valid) || elapsedMs > 15000) process.exitCode = 1;

import { performance } from 'node:perf_hooks';
import { buildShardedRelease, verifyShardedRelease } from '../src/research/shardedRelease.js';

const recordCount = 30_000;
const release = {
  format: 'triangle-packing-atlas/v2', version: 'scale-fixture', coverage: { records: recordCount },
  records: Array.from({ length: recordCount }, (_, index) => ({
    id: `scale-${String(index).padStart(5, '0')}`,
    family: index % 2 ? 'right' : 'isosceles',
    verification: { valid: true, utilization: (index % 1000) / 1000 }
  }))
};
const started = performance.now();
const built = buildShardedRelease(release, { recordsPerShard: 500 });
const buildMs = performance.now() - started;
const verifyStarted = performance.now();
const verification = verifyShardedRelease(built.index, built.files, release);
const verifyMs = performance.now() - verifyStarted;
const report = {
  format: 'tpa-sharded-release-benchmark/v1',
  records: recordCount,
  shards: built.index.shards.length,
  largestShardBytes: Math.max(...built.index.shards.map(shard => shard.bytes)),
  buildMs: Number(buildMs.toFixed(2)),
  verifyMs: Number(verifyMs.toFixed(2)),
  valid: verification.valid,
  passes: verification.valid && built.index.shards.length === 60 && buildMs + verifyMs < 5000
};
console.log(JSON.stringify(report, null, 2));
if (!report.passes) process.exitCode = 1;

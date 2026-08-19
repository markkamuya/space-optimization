import assert from 'node:assert/strict';
import { createHash, webcrypto } from 'node:crypto';
import { performance } from 'node:perf_hooks';
import { buildShardedRelease } from '../src/research/shardedRelease.js';
import { loadIntegrityCheckedRelease } from '../src/ui/shardedReleaseLoader.js';

const recordCount = 10_000;
const release = {
  format: 'triangle-packing-atlas/v2',
  version: '2.0.0',
  coverage: { records: recordCount, verified: recordCount, phaseTransitions: 0 },
  transitions: [],
  records: Array.from({ length: recordCount }, (_, index) => ({ id: `scale-record-${String(index).padStart(5, '0')}`, verification: { valid: true } }))
};
const built = buildShardedRelease(release, { recordsPerShard: 100 });
const monolith = `${JSON.stringify(release)}\n`;
const responses = new Map([
  ['/atlas-v2-shards.json', `${JSON.stringify(built.index)}\n`],
  ['/atlas-v2.json', monolith],
  ['/atlas-v2.sha256', `${createHash('sha256').update(monolith).digest('hex')}  atlas-v2.json\n`],
  ...[...built.files].map(([path, payload]) => [`/${path}`, payload])
]);
let inFlight = 0;
let maxInFlight = 0;
let fetchedBytes = 0;
const fetchImpl = async path => {
  inFlight += 1;
  maxInFlight = Math.max(maxInFlight, inFlight);
  await Promise.resolve();
  const payload = responses.get(path);
  fetchedBytes += Buffer.byteLength(payload ?? '');
  inFlight -= 1;
  return new Response(payload ?? 'missing', { status: payload == null ? 404 : 200 });
};
const progress = [];
const started = performance.now();
const result = await loadIntegrityCheckedRelease({ fetchImpl, cryptoImpl: webcrypto, onProgress: update => progress.push(update) });
const durationMs = performance.now() - started;

assert.equal(result.release.records.length, recordCount);
assert.equal(progress.length, built.index.shards.length);
assert.equal(progress.at(-1).loadedRecords, recordCount);
assert.equal(progress.at(-1).loadedBytes, progress.at(-1).totalBytes);
assert.equal(maxInFlight, 1, 'Shard loading must keep network and parse work bounded to one shard at a time');
assert.ok(durationMs < 5000, `10,000-record verified shard load took ${durationMs.toFixed(1)}ms`);
console.log(JSON.stringify({
  records: recordCount,
  shards: built.index.shards.length,
  maxInFlight,
  fetchedBytes,
  durationMs: Number(durationMs.toFixed(2)),
  completeProgressEvents: progress.length
}));

import assert from 'node:assert/strict';
import test from 'node:test';
import { buildShardedRelease, verifyShardedRelease } from '../../src/research/shardedRelease.js';

function fixture(count = 7) {
  return {
    format: 'triangle-packing-atlas/v2', version: '2.0.0', coverage: { records: count },
    records: Array.from({ length: count }, (_, index) => ({ id: `record-${index}`, verification: { valid: true } }))
  };
}

test('sharded releases are byte-deterministic and reconstruct the monolith exactly', () => {
  const release = fixture();
  const first = buildShardedRelease(release, { recordsPerShard: 3 });
  const second = buildShardedRelease(structuredClone(release), { recordsPerShard: 3 });
  assert.deepEqual(first, second);
  assert.equal(first.index.shards.length, 3);
  const report = verifyShardedRelease(first.index, first.files, release);
  assert.equal(report.valid, true);
  assert.deepEqual(report.reconstructed, release);
});

test('sharded release verification rejects missing, reordered, duplicated, and tampered data', () => {
  const release = fixture();
  const built = buildShardedRelease(release, { recordsPerShard: 3 });
  const missing = new Map(built.files);
  missing.delete(built.index.shards[0].path);
  assert.equal(verifyShardedRelease(built.index, missing, release).valid, false);
  const tampered = new Map(built.files);
  tampered.set(built.index.shards[0].path, tampered.get(built.index.shards[0].path).replace('record-0', 'forged'));
  assert.ok(verifyShardedRelease(built.index, tampered, release).errors.some(error => error.startsWith('SHARD_DIGEST_DRIFT')));
  const reordered = structuredClone(built.index);
  reordered.shards.reverse();
  assert.ok(verifyShardedRelease(reordered, built.files, release).errors.includes('SHARD_DESCRIPTOR_INVALID'));
  const duplicate = fixture();
  duplicate.records[1].id = duplicate.records[0].id;
  const duplicateBuilt = buildShardedRelease(duplicate, { recordsPerShard: 3 });
  assert.ok(verifyShardedRelease(duplicateBuilt.index, duplicateBuilt.files, duplicate).errors.includes('SHARD_RECORD_COVERAGE_INVALID'));
});

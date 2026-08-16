import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash, webcrypto } from 'node:crypto';
import { buildShardedRelease } from '../../src/research/shardedRelease.js';
import { loadIntegrityCheckedRelease } from '../../src/ui/shardedReleaseLoader.js';

function fixture() {
  return {
    format: 'triangle-packing-atlas/v2', version: '2.0.0',
    coverage: { records: 5, verified: 5, phaseTransitions: 0 }, transitions: [],
    records: Array.from({ length: 5 }, (_, index) => ({ id: `r-${index}`, verification: { valid: true } }))
  };
}

function responseMap(release, mutate = () => {}) {
  const built = buildShardedRelease(release, { recordsPerShard: 2 });
  const monolith = `${JSON.stringify(release)}\n`;
  const responses = new Map([
    ['/atlas-v2-shards.json', `${JSON.stringify(built.index)}\n`],
    ['/atlas-v2.json', monolith],
    ['/atlas-v2.sha256', `${createHash('sha256').update(monolith).digest('hex')}  atlas-v2.json\n`],
    ...[...built.files].map(([path, payload]) => [`/${path}`, payload])
  ]);
  mutate(responses, built);
  return async path => new Response(responses.get(path) ?? 'missing', { status: responses.has(path) ? 200 : 404 });
}

test('browser loader verifies and progressively assembles every shard', async () => {
  const release = fixture();
  const progress = [];
  const result = await loadIntegrityCheckedRelease({
    fetchImpl: responseMap(release), cryptoImpl: webcrypto, onProgress: update => progress.push(update)
  });
  assert.equal(result.source, 'verified_shards');
  assert.deepEqual(result.release, release);
  assert.deepEqual(progress.map(update => update.loadedRecords), [2, 4, 5]);
});

test('browser loader rejects a bad shard and uses only a checksum-verified monolith fallback', async () => {
  const release = fixture();
  const fetchImpl = responseMap(release, (responses, built) => {
    const path = `/${built.index.shards[0].path}`;
    responses.set(path, responses.get(path).replace('r-0', 'forged'));
  });
  const result = await loadIntegrityCheckedRelease({ fetchImpl, cryptoImpl: webcrypto });
  assert.equal(result.source, 'verified_monolith_fallback');
  assert.match(result.warning, /shard_integrity_mismatch/);
  assert.deepEqual(result.release, release);
});

test('browser loader fails closed when both shard and fallback integrity are invalid', async () => {
  const release = fixture();
  const fetchImpl = responseMap(release, responses => {
    responses.set('/atlas-v2-shards.json', '{}');
    responses.set('/atlas-v2.sha256', `${'0'.repeat(64)}  atlas-v2.json\n`);
  });
  await assert.rejects(() => loadIntegrityCheckedRelease({ fetchImpl, cryptoImpl: webcrypto }), /monolith_integrity_mismatch/);
});

test('aborted shard attempts never fall through to a second release source', async () => {
  const controller = new AbortController();
  let requests = 0;
  const fetchImpl = async (_path, options) => {
    requests += 1;
    assert.equal(options.signal, controller.signal);
    controller.abort();
    throw new DOMException('Aborted', 'AbortError');
  };
  await assert.rejects(() => loadIntegrityCheckedRelease({
    fetchImpl, cryptoImpl: webcrypto, signal: controller.signal
  }), error => error.name === 'AbortError');
  assert.equal(requests, 1);
});

const encoder = new TextEncoder();

async function sha256(payload, cryptoImpl) {
  if (!cryptoImpl?.subtle) throw new Error('integrity_verification_unavailable');
  const bytes = typeof payload === 'string' ? encoder.encode(payload) : payload;
  const digest = await cryptoImpl.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

async function fetchText(fetchImpl, path, signal) {
  const response = await fetchImpl(path, { signal });
  if (!response.ok) throw new Error(`http_${response.status}:${path}`);
  return response.text();
}

async function loadShards(fetchImpl, cryptoImpl, onProgress, signal) {
  const index = JSON.parse(await fetchText(fetchImpl, '/atlas-v2-shards.json', signal));
  if (index.format !== 'triangle-packing-atlas-sharded-release/v1' || !Array.isArray(index.shards)) {
    throw new Error('invalid_shard_index');
  }
  const { sha256: expectedIndexDigest, ...indexStatement } = index;
  if (await sha256(JSON.stringify(indexStatement), cryptoImpl) !== expectedIndexDigest) {
    throw new Error('shard_index_digest_mismatch');
  }
  const records = [];
  const ids = new Set();
  const totalBytes = index.shards.reduce((total, descriptor) => total + descriptor.bytes, 0);
  let loadedBytes = 0;
  for (const [position, descriptor] of index.shards.entries()) {
    if (descriptor.order !== position || !/^atlas-v2-shards\/\d{3}\.json$/.test(descriptor.path)) {
      throw new Error('invalid_shard_descriptor');
    }
    const payload = await fetchText(fetchImpl, `/${descriptor.path}`, signal);
    if (encoder.encode(payload).byteLength !== descriptor.bytes || await sha256(payload, cryptoImpl) !== descriptor.sha256) {
      throw new Error(`shard_integrity_mismatch:${descriptor.path}`);
    }
    const shard = JSON.parse(payload);
    loadedBytes += descriptor.bytes;
    if (shard.format !== 'triangle-packing-atlas-record-shard/v1' || shard.order !== position ||
      shard.records?.length !== descriptor.records || shard.records[0]?.id !== descriptor.firstRecordId ||
      shard.records.at(-1)?.id !== descriptor.lastRecordId) throw new Error(`invalid_shard_content:${descriptor.path}`);
    for (const record of shard.records) {
      if (ids.has(record.id)) throw new Error(`duplicate_shard_record:${record.id}`);
      ids.add(record.id);
      records.push(record);
    }
    onProgress?.({
      loadedShards: position + 1,
      totalShards: index.shards.length,
      loadedRecords: records.length,
      totalRecords: index.recordCount,
      loadedBytes,
      totalBytes
    });
  }
  if (records.length !== index.recordCount) throw new Error('incomplete_shard_coverage');
  return { release: { ...index.release, records }, source: 'verified_shards', warning: null };
}

async function loadVerifiedMonolith(fetchImpl, cryptoImpl, signal) {
  const [payload, checksumFile] = await Promise.all([
    fetchText(fetchImpl, '/atlas-v2.json', signal),
    fetchText(fetchImpl, '/atlas-v2.sha256', signal)
  ]);
  const expected = checksumFile.trim().split(/\s+/)[0];
  if (!/^[a-f0-9]{64}$/.test(expected) || await sha256(payload, cryptoImpl) !== expected) {
    throw new Error('monolith_integrity_mismatch');
  }
  return JSON.parse(payload);
}

export async function loadIntegrityCheckedRelease(options = {}) {
  const fetchImpl = options.fetchImpl ?? fetch;
  const cryptoImpl = options.cryptoImpl ?? globalThis.crypto;
  try {
    return await loadShards(fetchImpl, cryptoImpl, options.onProgress, options.signal);
  } catch (shardError) {
    if (options.signal?.aborted || shardError.name === 'AbortError') throw shardError;
    const release = await loadVerifiedMonolith(fetchImpl, cryptoImpl, options.signal);
    return { release, source: 'verified_monolith_fallback', warning: shardError.message };
  }
}

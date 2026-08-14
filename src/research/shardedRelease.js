import { createHash } from 'node:crypto';

function sha256(payload) {
  return createHash('sha256').update(payload).digest('hex');
}

function indexStatement(index) {
  const { sha256: _digest, ...statement } = index;
  return statement;
}

export function buildShardedRelease(release, options = {}) {
  const recordsPerShard = options.recordsPerShard ?? 76;
  if (!Array.isArray(release?.records) || !Number.isInteger(recordsPerShard) || recordsPerShard <= 0) {
    throw new TypeError('invalid_sharded_release_input');
  }
  const { records, ...releaseMetadata } = release;
  const files = new Map();
  const shards = [];
  for (let start = 0, order = 0; start < records.length; start += recordsPerShard, order += 1) {
    const shardRecords = records.slice(start, start + recordsPerShard);
    const shard = {
      format: 'triangle-packing-atlas-record-shard/v1',
      version: release.version,
      order,
      records: shardRecords
    };
    const payload = `${JSON.stringify(shard)}\n`;
    const path = `atlas-v2-shards/${String(order).padStart(3, '0')}.json`;
    files.set(path, payload);
    shards.push({
      path,
      order,
      records: shardRecords.length,
      firstRecordId: shardRecords[0]?.id ?? null,
      lastRecordId: shardRecords.at(-1)?.id ?? null,
      bytes: Buffer.byteLength(payload),
      sha256: sha256(payload)
    });
  }
  const statement = {
    format: 'triangle-packing-atlas-sharded-release/v1',
    version: release.version,
    recordCount: records.length,
    recordsPerShard,
    release: releaseMetadata,
    shards
  };
  return { index: { ...statement, sha256: sha256(JSON.stringify(statement)) }, files };
}

export function verifyShardedRelease(index, files, expectedRelease) {
  const errors = [];
  if (index?.format !== 'triangle-packing-atlas-sharded-release/v1' || !Array.isArray(index?.shards)) {
    errors.push('SHARD_INDEX_FORMAT_INVALID');
  }
  if (index?.sha256 !== sha256(JSON.stringify(indexStatement(index)))) errors.push('SHARD_INDEX_DIGEST_DRIFT');
  const paths = new Set();
  const records = [];
  for (const [position, descriptor] of (index?.shards ?? []).entries()) {
    if (descriptor.order !== position || !/^atlas-v2-shards\/\d{3}\.json$/.test(descriptor.path) || paths.has(descriptor.path)) {
      errors.push('SHARD_DESCRIPTOR_INVALID');
      continue;
    }
    paths.add(descriptor.path);
    const payload = files.get(descriptor.path);
    if (typeof payload !== 'string') {
      errors.push(`SHARD_MISSING:${descriptor.path}`);
      continue;
    }
    if (Buffer.byteLength(payload) !== descriptor.bytes || sha256(payload) !== descriptor.sha256) {
      errors.push(`SHARD_DIGEST_DRIFT:${descriptor.path}`);
      continue;
    }
    try {
      const shard = JSON.parse(payload);
      if (shard.format !== 'triangle-packing-atlas-record-shard/v1' || shard.order !== descriptor.order ||
        shard.records?.length !== descriptor.records || shard.records[0]?.id !== descriptor.firstRecordId ||
        shard.records.at(-1)?.id !== descriptor.lastRecordId) {
        errors.push(`SHARD_CONTENT_INVALID:${descriptor.path}`);
        continue;
      }
      records.push(...shard.records);
    } catch {
      errors.push(`SHARD_JSON_INVALID:${descriptor.path}`);
    }
  }
  if (records.length !== index?.recordCount || new Set(records.map(record => record.id)).size !== records.length) {
    errors.push('SHARD_RECORD_COVERAGE_INVALID');
  }
  const reconstructed = { ...(index?.release ?? {}), records };
  if (expectedRelease !== undefined && JSON.stringify(reconstructed) !== JSON.stringify(expectedRelease)) {
    errors.push('SHARD_RECONSTRUCTION_DRIFT');
  }
  return { valid: errors.length === 0, errors: [...new Set(errors)], records: records.length, reconstructed };
}

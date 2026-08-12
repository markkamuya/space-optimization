import { createHash } from 'node:crypto';
import { validateCanonicalRecords } from './registry.js';

export function auditArtifactChecksum(datasetPayload, checksumFile, manifest) {
  const actual = createHash('sha256').update(datasetPayload).digest('hex');
  const declared = typeof checksumFile === 'string'
    ? checksumFile.trim().split(/\s+/)[0]
    : null;
  const errors = [];
  if (declared !== actual) errors.push('CHECKSUM_FILE_DRIFT');
  if (manifest?.sha256 !== actual) errors.push('MANIFEST_CHECKSUM_DRIFT');
  return { valid: errors.length === 0, actual, errors };
}

export function auditReleaseManifest(manifest, release) {
  const errors = [];
  const expectedAudit = validateCanonicalRecords(release.records);
  const expected = {
    format: 'triangle-packing-atlas-release-manifest/v2',
    version: release.version,
    dataset: 'public/atlas-v2.json',
    csv: 'public/atlas-v2.csv',
    queue: 'public/work-queue-v2.json',
    records: release.records.length,
    immutable: true
  };
  for (const [field, value] of Object.entries(expected)) {
    if (manifest?.[field] !== value) errors.push(`MANIFEST_${field.toUpperCase()}_DRIFT`);
  }
  if (JSON.stringify(manifest?.audit) !== JSON.stringify(expectedAudit)) {
    errors.push('MANIFEST_AUDIT_DRIFT');
  }
  return { valid: errors.length === 0, errors };
}

export function auditArchiveManifest(manifestPayload, checksumFile, files) {
  const errors = [];
  const manifestHash = createHash('sha256').update(manifestPayload).digest('hex');
  const declaredManifestHash = checksumFile.trim().split(/\s+/)[0];
  if (declaredManifestHash !== manifestHash) errors.push('ARCHIVE_MANIFEST_CHECKSUM_DRIFT');
  let manifest;
  try {
    manifest = JSON.parse(manifestPayload);
  } catch {
    return { valid: false, errors: [...errors, 'ARCHIVE_MANIFEST_INVALID_JSON'], files: 0 };
  }
  if (manifest?.format !== 'triangle-packing-atlas-archive/v2') {
    errors.push('ARCHIVE_MANIFEST_FORMAT_INVALID');
  }
  if (!Array.isArray(manifest?.files)) {
    errors.push('ARCHIVE_MANIFEST_FILES_INVALID');
    return { valid: false, errors, files: 0 };
  }
  const seen = new Set();
  for (const entry of manifest.files) {
    if (!entry || typeof entry !== 'object' || Array.isArray(entry) ||
      typeof entry.path !== 'string' || entry.path.length === 0 ||
      entry.path.startsWith('/') || entry.path.split('/').includes('..')) {
      errors.push('ARCHIVE_MANIFEST_ENTRY_INVALID');
      continue;
    }
    if (seen.has(entry.path)) errors.push(`ARCHIVE_DUPLICATE_PATH:${entry.path}`);
    seen.add(entry.path);
    if (!Number.isInteger(entry.bytes) || entry.bytes < 0) {
      errors.push(`ARCHIVE_BYTES_INVALID:${entry.path}`);
    }
    if (typeof entry.sha256 !== 'string' || !/^[0-9a-f]{64}$/.test(entry.sha256)) {
      errors.push(`ARCHIVE_SHA256_INVALID:${entry.path}`);
    }
    const payload = files.get(entry.path);
    if (!Buffer.isBuffer(payload)) {
      errors.push(`ARCHIVE_FILE_MISSING:${entry.path}`);
      continue;
    }
    if (Number.isInteger(entry.bytes) && payload.byteLength !== entry.bytes) {
      errors.push(`ARCHIVE_SIZE_DRIFT:${entry.path}`);
    }
    const sha256 = createHash('sha256').update(payload).digest('hex');
    if (/^[0-9a-f]{64}$/.test(entry.sha256 ?? '') && sha256 !== entry.sha256) {
      errors.push(`ARCHIVE_FILE_CHECKSUM_DRIFT:${entry.path}`);
    }
  }
  return { valid: errors.length === 0, errors, files: seen.size };
}

export function auditTarInventory(entries, requiredPaths, options = {}) {
  const errors = [];
  const counts = new Map();
  for (const path of entries) {
    if (path.startsWith('/') || path.split('/').includes('..')) {
      errors.push(`TARBALL_UNSAFE_PATH:${path}`);
      continue;
    }
    counts.set(path, (counts.get(path) ?? 0) + 1);
  }
  for (const path of requiredPaths) {
    const count = counts.get(path) ?? 0;
    if (count === 0) errors.push(`TARBALL_FILE_MISSING:${path}`);
    if (count > 1) errors.push(`TARBALL_DUPLICATE_PATH:${path}`);
  }
  if (options.exact === true) {
    const allowed = new Set(requiredPaths);
    for (const path of counts.keys()) {
      if (!allowed.has(path)) errors.push(`TARBALL_UNDECLARED_PATH:${path}`);
    }
  }
  return { valid: errors.length === 0, errors, entries: entries.length };
}

export function auditTarEntryTypes(entries, requiredPaths) {
  const errors = [];
  const byPath = new Map(entries.map(entry => [entry.path, entry.type]));
  for (const path of requiredPaths) {
    if (byPath.has(path) && byPath.get(path) !== '-') {
      errors.push(`TARBALL_NOT_REGULAR_FILE:${path}`);
    }
  }
  return { valid: errors.length === 0, errors, entries: entries.length };
}

export function auditArchivedControlFiles(archived, expected) {
  const errors = [];
  for (const [path, payload] of expected) {
    const archivedPayload = archived.get(path);
    if (!Buffer.isBuffer(archivedPayload)) {
      errors.push(`TARBALL_CONTROL_FILE_MISSING:${path}`);
    } else if (!archivedPayload.equals(payload)) {
      errors.push(`TARBALL_CONTROL_FILE_DRIFT:${path}`);
    }
  }
  return { valid: errors.length === 0, errors, files: expected.size };
}

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

import { createHash } from 'node:crypto';

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

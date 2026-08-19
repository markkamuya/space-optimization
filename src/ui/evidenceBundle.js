export const EVIDENCE_BUNDLE_FORMAT = 'triangle-packing-atlas-record-evidence/v1';

export function createEvidenceBundle(record, release, integrity, source) {
  if (!record || !release || !integrity?.digest || !source) throw new Error('verified_evidence_unavailable');
  return {
    format: EVIDENCE_BUNDLE_FORMAT,
    exportedAt: new Date().toISOString(),
    release: {
      version: release.version,
      releasedAt: release.releasedAt,
      source,
      integrity: { ...integrity }
    },
    record
  };
}

export function validateEvidenceBundle(bundle, trustedRecord, trustedRelease, trustedIntegrity, trustedSource) {
  const issues = [];
  if (!bundle || typeof bundle !== 'object') return { valid: false, issues: ['The selected file is not a JSON evidence object.'] };
  if (bundle.format !== EVIDENCE_BUNDLE_FORMAT) issues.push('The evidence format is missing or unsupported.');
  if (!trustedRecord || !trustedRelease || !trustedIntegrity?.digest || !trustedSource) {
    issues.push('A verified Atlas release is not available for comparison.');
    return { valid: false, issues };
  }
  if (bundle.record?.id !== trustedRecord.id) issues.push('The record identity does not match this result.');
  if (bundle.record?.verification?.certificate !== trustedRecord.verification.certificate) issues.push('The verification certificate does not match.');
  if (bundle.record?.verification?.fingerprint !== trustedRecord.verification.fingerprint) issues.push('The record fingerprint does not match.');
  if (bundle.record?.reproducibility?.command !== trustedRecord.reproducibility.command ||
      bundle.record?.reproducibility?.seed !== trustedRecord.reproducibility.seed) {
    issues.push('The reproduction command or seed does not match.');
  }
  if (bundle.release?.version !== trustedRelease.version || bundle.release?.releasedAt !== trustedRelease.releasedAt) {
    issues.push('The bundle belongs to a different Atlas release.');
  }
  if (bundle.release?.source !== trustedSource || bundle.release?.integrity?.artifact !== trustedIntegrity.artifact ||
      bundle.release?.integrity?.digest !== trustedIntegrity.digest) {
    issues.push('The release source or integrity digest does not match this verified session.');
  }
  return { valid: issues.length === 0, issues };
}

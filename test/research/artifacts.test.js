import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { auditArtifactChecksum, auditReleaseManifest } from '../../src/research/artifacts.js';
import { validateCanonicalRecords } from '../../src/research/registry.js';

test('artifact audit binds dataset bytes to checksum file and manifest', () => {
  const payload = '{"records":[]}\n';
  const sha256 = createHash('sha256').update(payload).digest('hex');
  assert.equal(auditArtifactChecksum(payload, `${sha256}  atlas-v2.json\n`, { sha256 }).valid, true);
  const report = auditArtifactChecksum(`${payload} `, `${sha256}  atlas-v2.json\n`, { sha256 });
  assert.deepEqual(report.errors, ['CHECKSUM_FILE_DRIFT', 'MANIFEST_CHECKSUM_DRIFT']);
});

test('manifest audit recomputes canonical metadata and embedded registry audit', async () => {
  const published = JSON.parse(await readFile(
    new URL('../../public/atlas-v2.json', import.meta.url),
    'utf8'
  ));
  const records = [published.records[0]];
  const release = { version: '2.0.0', records };
  const manifest = {
    format: 'triangle-packing-atlas-release-manifest/v2',
    version: '2.0.0',
    dataset: 'public/atlas-v2.json',
    csv: 'public/atlas-v2.csv',
    queue: 'public/work-queue-v2.json',
    records: 1,
    immutable: true,
    audit: validateCanonicalRecords(records)
  };
  assert.equal(auditReleaseManifest(manifest, release).valid, true);
  manifest.records = 999;
  manifest.audit = { valid: true, errors: [], uniqueExperiments: 999 };
  const report = auditReleaseManifest(manifest, release);
  assert.ok(report.errors.includes('MANIFEST_RECORDS_DRIFT'));
  assert.ok(report.errors.includes('MANIFEST_AUDIT_DRIFT'));
});

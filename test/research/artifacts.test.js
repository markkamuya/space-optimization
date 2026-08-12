import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import {
  auditArchivedControlFiles,
  auditArchiveManifest,
  auditArtifactChecksum,
  auditReleaseManifest,
  auditTarInventory
} from '../../src/research/artifacts.js';
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

test('archive manifest audit validates its checksum and every listed file', () => {
  const payload = Buffer.from('atlas artifact');
  const entryHash = createHash('sha256').update(payload).digest('hex');
  const manifestPayload = Buffer.from(JSON.stringify({
    files: [{ path: 'public/example.json', bytes: payload.byteLength, sha256: entryHash }]
  }));
  const manifestHash = createHash('sha256').update(manifestPayload).digest('hex');
  const files = new Map([['public/example.json', payload]]);
  assert.equal(auditArchiveManifest(manifestPayload, `${manifestHash}  manifest.json\n`, files).valid, true);
  files.set('public/example.json', Buffer.from('tampered'));
  const report = auditArchiveManifest(manifestPayload, 'invalid  manifest.json\n', files);
  assert.ok(report.errors.includes('ARCHIVE_MANIFEST_CHECKSUM_DRIFT'));
  assert.ok(report.errors.includes('ARCHIVE_SIZE_DRIFT:public/example.json'));
  assert.ok(report.errors.includes('ARCHIVE_FILE_CHECKSUM_DRIFT:public/example.json'));
});

test('tarball inventory requires safe unique artifact paths', () => {
  assert.equal(auditTarInventory(['public/data.json'], ['public/data.json']).valid, true);
  const report = auditTarInventory(
    ['public/data.json', 'public/data.json', '../escape.json'],
    ['public/data.json', 'public/missing.json']
  );
  assert.ok(report.errors.includes('TARBALL_DUPLICATE_PATH:public/data.json'));
  assert.ok(report.errors.includes('TARBALL_UNSAFE_PATH:../escape.json'));
  assert.ok(report.errors.includes('TARBALL_FILE_MISSING:public/missing.json'));
});

test('strict tarball inventory rejects undeclared payloads', () => {
  const report = auditTarInventory(
    ['public/data.json', 'unreviewed.bin'],
    ['public/data.json'],
    { exact: true }
  );
  assert.equal(report.valid, false);
  assert.ok(report.errors.includes('TARBALL_UNDECLARED_PATH:unreviewed.bin'));
});

test('archive audit compares embedded control files byte-for-byte', () => {
  const expected = new Map([
    ['releases/manifest.json', Buffer.from('manifest')],
    ['releases/manifest.sha256', Buffer.from('checksum')]
  ]);
  const archived = new Map([
    ['releases/manifest.json', Buffer.from('manifest')],
    ['releases/manifest.sha256', Buffer.from('tampered')]
  ]);
  const report = auditArchivedControlFiles(archived, expected);
  assert.equal(report.valid, false);
  assert.deepEqual(report.errors, [
    'TARBALL_CONTROL_FILE_DRIFT:releases/manifest.sha256'
  ]);
});

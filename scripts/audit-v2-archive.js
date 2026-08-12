import { readFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  auditArchivedControlFiles,
  auditArchiveManifest,
  auditTarInventory
} from '../src/research/artifacts.js';
import { V2_ARCHIVE_PATHS } from '../src/research/archiveInventory.js';

const manifestUrl = new URL('../releases/2.0.0-archive-manifest.json', import.meta.url);
const [manifestPayload, checksumPayload, canonicalManifestPayload] = await Promise.all([
  readFile(manifestUrl),
  readFile(new URL('../releases/2.0.0-archive-manifest.sha256', import.meta.url)),
  readFile(new URL('../releases/2.0.0-canonical.json', import.meta.url))
]);
const checksumFile = checksumPayload.toString('utf8');
const manifestShape = auditArchiveManifest(manifestPayload, checksumFile, new Map());
const unsafeManifest = manifestShape.errors.some(error =>
  error === 'ARCHIVE_MANIFEST_INVALID_JSON' ||
  error === 'ARCHIVE_MANIFEST_FILES_INVALID' ||
  error === 'ARCHIVE_MANIFEST_ENTRY_INVALID');
if (unsafeManifest) throw new Error(`Unsafe archive manifest: ${manifestShape.errors.join(', ')}`);
const manifest = JSON.parse(manifestPayload);
const files = new Map(await Promise.all(manifest.files.map(async entry => [
  entry.path,
  await readFile(new URL(`../${entry.path}`, import.meta.url))
])));
const report = auditArchiveManifest(manifestPayload, checksumFile, files);
const archivePath = fileURLToPath(new URL('../releases/triangle-packing-atlas-2.0.0.tgz', import.meta.url));
const listing = spawnSync('tar', ['-tzf', archivePath], { encoding: 'utf8' });
if (listing.status !== 0) throw new Error(`Unable to list archive: ${listing.stderr}`);
const entries = listing.stdout.trim().split('\n').filter(Boolean);
const inventory = auditTarInventory(entries, V2_ARCHIVE_PATHS, { exact: true });
const archivedFiles = new Map();
for (const entry of manifest.files) {
  const extracted = spawnSync('tar', ['-xOzf', archivePath, entry.path], {
    maxBuffer: 32 * 1024 * 1024
  });
  if (extracted.status === 0) archivedFiles.set(entry.path, extracted.stdout);
}
const archivedManifestFiles = auditArchiveManifest(manifestPayload, checksumFile, archivedFiles);
const controlPaths = new Map([
  ['releases/2.0.0-archive-manifest.json', manifestPayload],
  ['releases/2.0.0-archive-manifest.sha256', checksumPayload],
  ['releases/2.0.0-canonical.json', canonicalManifestPayload]
]);
const archivedControls = new Map();
for (const path of controlPaths.keys()) {
  const extracted = spawnSync('tar', ['-xOzf', archivePath, path], {
    maxBuffer: 32 * 1024 * 1024
  });
  if (extracted.status === 0) archivedControls.set(path, extracted.stdout);
}
const controls = auditArchivedControlFiles(archivedControls, controlPaths);
const combined = {
  valid: report.valid && inventory.valid && archivedManifestFiles.valid && controls.valid,
  manifest: report,
  inventory,
  archivedFiles: archivedManifestFiles,
  controls
};
console.log(JSON.stringify(combined, null, 2));
if (!combined.valid) process.exitCode = 1;

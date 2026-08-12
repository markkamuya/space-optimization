import { readFile } from 'node:fs/promises';
import { auditArchiveManifest } from '../src/research/artifacts.js';

const manifestUrl = new URL('../releases/2.0.0-archive-manifest.json', import.meta.url);
const [manifestPayload, checksumFile] = await Promise.all([
  readFile(manifestUrl),
  readFile(new URL('../releases/2.0.0-archive-manifest.sha256', import.meta.url), 'utf8')
]);
const manifest = JSON.parse(manifestPayload);
const files = new Map(await Promise.all(manifest.files.map(async entry => [
  entry.path,
  await readFile(new URL(`../${entry.path}`, import.meta.url))
])));
const report = auditArchiveManifest(manifestPayload, checksumFile, files);
console.log(JSON.stringify(report, null, 2));
if (!report.valid) process.exitCode = 1;

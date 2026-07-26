import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RESEARCH_RELEASE } from '../src/research/dataset.js';

const publicDirectory = new URL('../public/', import.meta.url);
const releaseDirectory = new URL('../releases/', import.meta.url);
await mkdir(publicDirectory, { recursive: true });
await mkdir(releaseDirectory, { recursive: true });
const portableRelease = {
  ...RESEARCH_RELEASE,
  records: RESEARCH_RELEASE.records.map(record => ({
    ...record,
    problem: {
      name: record.problem.name,
      width: record.problem.width,
      height: record.problem.height,
      margin: record.problem.margin,
      kerf: record.problem.kerf,
      allowRotation: record.problem.allowRotation,
      allowReflection: record.problem.allowReflection,
      seed: record.problem.seed,
      homogeneousPiece: record.problem.triangles[0],
      count: record.solution.placements.length
    }
  }))
};
const payload = `${JSON.stringify(portableRelease)}\n`;
const checksum = createHash('sha256').update(payload).digest('hex');
await writeFile(new URL('atlas-research-v2.json', publicDirectory), payload);
await writeFile(new URL('atlas-research-v2.sha256', publicDirectory), `${checksum}  atlas-research-v2.json\n`);
await writeFile(new URL('2.0.0.json', releaseDirectory), `${JSON.stringify({
  format: 'triangle-packing-atlas-release-manifest/v2',
  version: RESEARCH_RELEASE.version,
  date: '2026-07-26',
  dataset: 'public/atlas-research-v2.json',
  sha256: checksum,
  license: 'CC-BY-4.0',
  doi: null,
  doiStatus: 'ready-for-provider-deposit',
  methodology: 'docs/METHODOLOGY_V2.md',
  citation: 'CITATION.cff',
  records: RESEARCH_RELEASE.recordCount,
  verified: RESEARCH_RELEASE.verifiedCount,
  immutable: true
}, null, 2)}\n`);
console.log(`Wrote ${RESEARCH_RELEASE.recordCount} records (${RESEARCH_RELEASE.verifiedCount} verified), sha256 ${checksum}.`);

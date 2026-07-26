import { mkdir, writeFile } from 'node:fs/promises';
import { ATLAS_RELEASE } from '../src/atlas/catalog.js';

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await writeFile(
  new URL('../public/atlas-v1.json', import.meta.url),
  `${JSON.stringify(ATLAS_RELEASE, null, 2)}\n`
);
console.log(`Wrote ${ATLAS_RELEASE.recordCount} verified records and ${ATLAS_RELEASE.openProblemCount} open problems.`);

import { readFile, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { V2_ARCHIVE_PATHS } from '../src/research/archiveInventory.js';
import { buildDeterministicTarGzip } from '../src/research/deterministicTar.js';

const root = fileURLToPath(new URL('../', import.meta.url));
const output = resolve(process.argv[2] ?? `${root}/releases/triangle-packing-atlas-2.0.0.tgz`);
const entries = await Promise.all(V2_ARCHIVE_PATHS.map(async path => [
  path,
  await readFile(resolve(root, path))
]));

await writeFile(output, buildDeterministicTarGzip(entries));
console.log(`Wrote ${output}`);

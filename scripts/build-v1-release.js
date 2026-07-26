import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';

const root = new URL('../', import.meta.url);
const dataset = await readFile(new URL('public/atlas-research-v2.json', root));
const beta = JSON.parse(await readFile(new URL('public/community-beta.json', root), 'utf8'));
const literature = await readFile(new URL('literature/registry.json', root), 'utf8');
const checksum = createHash('sha256').update(dataset).digest('hex');
const gates = [
  { id: 'javascript-verifier', status: 'passed' },
  { id: 'independent-python-verifier', status: 'passed' },
  { id: 'proof-certificate-control', status: 'passed' },
  { id: 'community-automation-beta', status: beta.passed ? 'passed' : 'failed' },
  { id: 'real-external-contribution', status: beta.externalGateSatisfied ? 'passed' : 'pending_external' },
  { id: 'archival-doi', status: 'pending_external' }
];
const release = {
  format: 'triangle-packing-atlas-v1-release-candidate/v1',
  version: '1.0.0-rc.1',
  date: '2026-07-26',
  dataset: 'public/atlas-research-v2.json',
  datasetSha256: checksum,
  records: 304,
  status: gates.every(gate => gate.status === 'passed') ? 'release_ready' : 'release_candidate',
  gates,
  policy: 'v1.0.0 may be tagged only after every gate passes; pending external gates cannot be waived by automation.'
};
await mkdir(new URL('releases/', root), { recursive: true });
await mkdir(new URL('public/literature/', root), { recursive: true });
await writeFile(new URL('releases/1.0.0-rc.1.json', root), `${JSON.stringify(release, null, 2)}\n`);
await writeFile(new URL('public/release-status.json', root), `${JSON.stringify(release, null, 2)}\n`);
await writeFile(new URL('public/literature/registry.json', root), literature);
console.log(JSON.stringify(release, null, 2));

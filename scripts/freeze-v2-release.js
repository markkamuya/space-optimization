import { createHash } from 'node:crypto';
import { readFile, writeFile } from 'node:fs/promises';

const artifacts = [
  'public/atlas-v2.json',
  'public/atlas-v2.csv',
  'public/audit-v2.json',
  'public/work-queue-v2.json',
  'public/community-challenges-v2.json',
  'public/finite-domain-proofs-v2.json',
  'public/finite-domain-proof-jobs-v2.json',
  'proofs/finite-domain-right-control.spec.json',
  'independent_verifier/verify_finite_domain.py',
  'schemas/canonical-release.schema.json',
  'schemas/finite-domain-certificate.schema.json',
  'schemas/finite-domain-proof-job.schema.json',
  'docs/METHODOLOGY_V2.md',
  'docs/ATLAS_V2_RELEASE.md',
  'docs/MATHEMATICAL_CERTIFICATES_V2.md',
  'CITATION.cff',
  '.zenodo.json'
];
const files = [];
for (const path of artifacts) {
  const bytes = await readFile(new URL(`../${path}`, import.meta.url));
  files.push({
    path,
    bytes: bytes.length,
    sha256: createHash('sha256').update(bytes).digest('hex')
  });
}
const manifest = {
  format: 'triangle-packing-atlas-archive/v2',
  version: '2.0.0',
  frozenAt: '2026-07-26T00:00:00.000Z',
  doi: null,
  doiStatus: 'awaiting_authorized_provider_deposit',
  gitTag: 'v2.0.0',
  files
};
const payload = `${JSON.stringify(manifest, null, 2)}\n`;
await writeFile(new URL('../releases/2.0.0-archive-manifest.json', import.meta.url), payload);
await writeFile(new URL('../releases/2.0.0-archive-manifest.sha256', import.meta.url),
  `${createHash('sha256').update(payload).digest('hex')}  2.0.0-archive-manifest.json\n`);
console.log(`Frozen ${files.length} artifacts for v2.0.0.`);

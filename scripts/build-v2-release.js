import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { RESEARCH_RECORDS } from '../src/research/dataset.js';
import {
  CANONICAL_FORMAT,
  canonicalRecord,
  detectPhaseTransitions,
  validateCanonicalRecords
} from '../src/research/registry.js';
import { buildWorkQueue } from '../src/research/distributed.js';

const records = RESEARCH_RECORDS.map(canonicalRecord);
const audit = validateCanonicalRecords(records);
if (!audit.valid) throw new Error(`Canonical registry failed: ${JSON.stringify(audit.errors.slice(0, 5))}`);

const transitions = detectPhaseTransitions(records);
const queue = buildWorkQueue(records);
const release = {
  format: CANONICAL_FORMAT,
  version: '2.0.0',
  releasedAt: '2026-07-26T00:00:00.000Z',
  license: 'CC-BY-4.0',
  citation: 'CITATION.cff',
  methodology: 'docs/METHODOLOGY_V2.md',
  claimPolicy: 'literature/CLAIM_POLICY.md',
  verificationPolicy: {
    independentImplementations: ['src/atlas/verifier.js', 'independent_verifier/verify_release.py'],
    tolerancePolicy: 'docs/NUMERICAL_POLICY.md',
    certificateRequired: true
  },
  coverage: {
    records: records.length,
    verified: records.filter(record => record.verification.valid).length,
    provenOptimal: records.filter(record => record.evidence.state === 'proven_optimal').length,
    families: Object.fromEntries([...Map.groupBy(records, record => record.family)]
      .map(([family, values]) => [family, values.length])),
    openDistributedTasks: queue.length,
    phaseTransitions: transitions.length
  },
  transitions,
  records
};

const payload = `${JSON.stringify(release)}\n`;
const checksum = createHash('sha256').update(payload).digest('hex');
const csvHeader = ['id', 'experiment_id', 'family', 'apex_angle', 'rectangle_ratio', 'pattern', 'evidence', 'pieces', 'utilization', 'upper_bound', 'gap', 'fingerprint'];
const csvRows = records.map(record => [
  record.id,
  record.experimentId,
  record.family,
  record.parameters.apexAngle,
  record.parameters.rectangleRatio,
  record.pattern,
  record.evidence.state,
  record.verification.pieceCount,
  record.verification.utilization,
  record.bounds.upperBound,
  record.bounds.optimalityGap,
  record.verification.fingerprint
].map(value => `"${String(value).replaceAll('"', '""')}"`).join(','));

await mkdir(new URL('../public/', import.meta.url), { recursive: true });
await mkdir(new URL('../releases/', import.meta.url), { recursive: true });
await writeFile(new URL('../public/atlas-v2.json', import.meta.url), payload);
await writeFile(new URL('../public/atlas-v2.csv', import.meta.url), `${csvHeader.join(',')}\n${csvRows.join('\n')}\n`);
await writeFile(new URL('../public/atlas-v2.sha256', import.meta.url), `${checksum}  atlas-v2.json\n`);
await writeFile(new URL('../public/work-queue-v2.json', import.meta.url), `${JSON.stringify({ format: 'tpa-work-queue/v1', version: '2.0.0', tasks: queue }, null, 2)}\n`);
await writeFile(new URL('../releases/2.0.0-canonical.json', import.meta.url), `${JSON.stringify({
  format: 'triangle-packing-atlas-release-manifest/v2',
  version: '2.0.0',
  dataset: 'public/atlas-v2.json',
  csv: 'public/atlas-v2.csv',
  queue: 'public/work-queue-v2.json',
  sha256: checksum,
  records: records.length,
  audit,
  immutable: true,
  doi: null,
  doiStatus: 'ready-for-provider-deposit'
}, null, 2)}\n`);
console.log(`Canonical v2: ${records.length} records, ${transitions.length} transitions, ${queue.length} open tasks, sha256 ${checksum}.`);

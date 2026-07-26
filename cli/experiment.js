import { parseArgs } from 'node:util';
import { RESEARCH_RECORDS } from '../src/research/dataset.js';
import { canonicalRecord } from '../src/research/registry.js';
import { verifyPacking } from '../src/atlas/verifier.js';

const { values } = parseArgs({ options: { record: { type: 'string', short: 'r' } } });
if (!values.record) throw new Error('Usage: npm run atlas:experiment -- --record <record-id>');
const source = RESEARCH_RECORDS.find(record => record.id === values.record);
if (!source) throw new Error(`Unknown record: ${values.record}`);
const record = canonicalRecord(source);
const verification = verifyPacking(record.problem, record.solution.placements);
if (!verification.valid || verification.fingerprint !== record.verification.fingerprint) {
  throw new Error(`Reproduction failed for ${record.id}`);
}
console.log(JSON.stringify({
  recordId: record.id,
  experimentId: record.experimentId,
  valid: verification.valid,
  fingerprint: verification.fingerprint,
  expectedFingerprint: record.verification.fingerprint,
  utilization: verification.metrics.utilization,
  command: record.reproducibility.command
}, null, 2));

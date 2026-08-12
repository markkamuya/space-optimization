import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';

import { auditArtifactChecksum } from '../../src/research/artifacts.js';

test('artifact audit binds dataset bytes to checksum file and manifest', () => {
  const payload = '{"records":[]}\n';
  const sha256 = createHash('sha256').update(payload).digest('hex');
  assert.equal(auditArtifactChecksum(payload, `${sha256}  atlas-v2.json\n`, { sha256 }).valid, true);
  const report = auditArtifactChecksum(`${payload} `, `${sha256}  atlas-v2.json\n`, { sha256 });
  assert.deepEqual(report.errors, ['CHECKSUM_FILE_DRIFT', 'MANIFEST_CHECKSUM_DRIFT']);
});

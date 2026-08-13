import assert from 'node:assert/strict';
import test from 'node:test';
import { mkdtemp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { join } from 'node:path';
import { tmpdir } from 'node:os';

test('submission CLI reports every malformed input in a batch', async () => {
  const directory = await mkdtemp(join(tmpdir(), 'atlas-submission-'));
  const invalid = join(directory, 'invalid.json');
  const missing = join(directory, 'missing.json');
  await writeFile(invalid, '{');
  const result = spawnSync(process.execPath, ['cli/submission.js', invalid, missing], {
    cwd: new URL('../..', import.meta.url),
    encoding: 'utf8',
    timeout: 30_000
  });
  assert.equal(result.status, 1);
  const reports = JSON.parse(result.stdout);
  assert.deepEqual(reports.map(report => report.error.code), [
    'INVALID_JSON',
    'UNREADABLE_SUBMISSION'
  ]);
});

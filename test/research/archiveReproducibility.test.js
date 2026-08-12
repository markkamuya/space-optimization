import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';

import { V2_ARCHIVE_PATHS } from '../../src/research/archiveInventory.js';
import { buildDeterministicTarGzip } from '../../src/research/deterministicTar.js';

test('v2 archive is byte-for-byte reproducible', async () => {
  const entries = await Promise.all(V2_ARCHIVE_PATHS.map(async path => [
    path,
    await readFile(new URL(`../../${path}`, import.meta.url))
  ]));
  const first = buildDeterministicTarGzip(entries);
  const second = buildDeterministicTarGzip(entries);
  assert.equal(
    createHash('sha256').update(first).digest('hex'),
    createHash('sha256').update(second).digest('hex')
  );
  assert.deepEqual(first, second);
});

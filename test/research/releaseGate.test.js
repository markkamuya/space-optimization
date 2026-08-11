import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('release check includes independent and community acceptance gates', async () => {
  const manifest = JSON.parse(await readFile(
    new URL('../../package.json', import.meta.url),
    'utf8'
  ));
  const check = manifest.scripts.check;
  assert.match(check, /npm run atlas:cross-verify/);
  assert.match(check, /npm run atlas:beta/);
  assert.ok(
    check.indexOf('atlas:cross-verify') < check.indexOf('build'),
    'independent verification must run before the production build'
  );
  assert.ok(
    check.indexOf('atlas:beta') < check.indexOf('build'),
    'community acceptance simulation must run before the production build'
  );
});

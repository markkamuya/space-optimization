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
  assert.match(check, /npm run atlas:archive-audit/);
  assert.ok(
    check.indexOf('atlas:cross-verify') < check.indexOf('build'),
    'independent verification must run before the production build'
  );
  assert.ok(
    check.indexOf('atlas:beta') < check.indexOf('build'),
    'community acceptance simulation must run before the production build'
  );
  assert.ok(
    check.indexOf('atlas:archive-audit') < check.indexOf('build'),
    'archive integrity must be verified before the production build'
  );
});

test('GitHub CI audits canonical and frozen artifacts before production builds', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8'
  );
  for (const command of [
    'npm run atlas:v2',
    'npm run atlas:audit',
    'npm run atlas:cross-verify',
    'npm run atlas:archive-audit',
    'npm run build:vercel'
  ]) {
    assert.match(workflow, new RegExp(command.replaceAll(':', '\\:')));
  }
  const buildIndex = workflow.indexOf('npm run build:vercel');
  assert.ok(workflow.indexOf('npm run atlas:v2') < workflow.indexOf('npm run atlas:audit'));
  assert.ok(workflow.indexOf('npm run atlas:audit') < buildIndex);
  assert.ok(workflow.indexOf('npm run atlas:cross-verify') < buildIndex);
  assert.ok(workflow.indexOf('npm run atlas:archive-audit') < buildIndex);
});

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

test('GitHub CI rejects uncommitted generated release drift', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/ci.yml', import.meta.url),
    'utf8'
  );
  const generation = workflow.indexOf('npm run atlas:v2');
  const driftCheck = workflow.indexOf('git diff --exit-code -- public/atlas-v2.json');
  const audit = workflow.indexOf('npm run atlas:audit');
  assert.ok(generation >= 0);
  assert.ok(driftCheck > generation);
  assert.ok(audit > driftCheck);
  for (const artifact of [
    'public/atlas-v2.csv',
    'public/atlas-v2.sha256',
    'public/audit-v2.json',
    'public/work-queue-v2.json',
    'public/community-challenges-v2.json',
    'releases/2.0.0-canonical.json'
  ]) assert.ok(workflow.includes(artifact));
});

test('GitHub CI blocks insecure or integrity-drifted dependencies', async () => {
  const workflow = await readFile(new URL('../../.github/workflows/ci.yml', import.meta.url), 'utf8');
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  assert.match(workflow, /npm run supply-chain:audit/);
  assert.match(manifest.scripts['supply-chain:audit'], /npm audit --audit-level=high/);
});

test('submission CI validates all changed records in one incumbent replay', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/submission.yml', import.meta.url),
    'utf8'
  );
  assert.match(workflow, /mapfile -t records/);
  assert.match(workflow, /npm run atlas:submission -- "\$\{records\[@\]\}"/);
  assert.doesNotMatch(workflow, /while[\s\S]*npm run atlas:submission -- "\$record"/);
});

test('submission CI persists and independently verifies review evidence', async () => {
  const workflow = await readFile(
    new URL('../../.github/workflows/submission.yml', import.meta.url),
    'utf8'
  );
  assert.match(workflow, /--output submission-reports\/review-bundle\.json/);
  assert.match(workflow, /atlas:submission-verify -- submission-reports\/review-bundle\.json/);
  assert.match(workflow, /atlas:submission-cross-verify -- submission-reports\/review-bundle\.json/);
  assert.match(workflow, /name: atlas-submission-review-evidence/);
});

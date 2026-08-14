import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { auditDependencyLock } from '../../src/research/supplyChain.js';

test('dependency audit verifies every registry artifact and root declaration', async () => {
  const manifest = JSON.parse(await readFile(new URL('../../package.json', import.meta.url), 'utf8'));
  const lock = JSON.parse(await readFile(new URL('../../package-lock.json', import.meta.url), 'utf8'));
  const report = auditDependencyLock(manifest, lock);
  assert.equal(report.valid, true, JSON.stringify(report.errors));
  assert.ok(report.packages >= 10);
});

test('dependency audit rejects source, integrity, and manifest drift', () => {
  const manifest = { devDependencies: { vite: '1.0.0' } };
  const lock = { lockfileVersion: 3, packages: {
    '': { devDependencies: { vite: '2.0.0' } },
    'node_modules/vite': { version: '2.0.0', resolved: 'https://evil.invalid/vite.tgz' }
  } };
  const report = auditDependencyLock(manifest, lock);
  assert.equal(report.valid, false);
  assert.ok(report.errors.includes('ROOT_DEVDEPENDENCIES_DRIFT'));
  assert.ok(report.errors.some(error => error.startsWith('UNTRUSTED_PACKAGE_SOURCE:')));
  assert.ok(report.errors.some(error => error.startsWith('PACKAGE_INTEGRITY_MISSING:')));
});

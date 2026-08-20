import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('production UI exposes its browser target and runtime certification result', async () => {
  const [html, script] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /id="browser-support-title"/);
  assert.match(html, /Firefox/);
  assert.match(html, /Safari/);
  assert.match(html, /Chromium/);
  assert.match(html, /320px–1440px layouts/);
  assert.match(html, /up to 400% zoom/);
  assert.match(script, /passed the Atlas verification and interaction capability check/);
});

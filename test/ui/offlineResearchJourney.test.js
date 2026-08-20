import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

test('offline readiness is explicit, inspectable, and screen-reader announced', () => {
  assert.match(html, /id="offline-readiness"[^>]+aria-labelledby="offline-readiness-title"/);
  assert.match(html, /id="offline-readiness-status" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"/);
  assert.match(html, /id="offline-readiness-check"[^>]+>Check offline readiness/);
  assert.match(script, /Offline reload will still recheck every required release artifact and fail closed if any are missing/);
});

test('offline reload attempts only integrity-checked cached release data', () => {
  assert.match(script, /!navigator\.onLine && !navigator\.serviceWorker\?\.controller/);
  assert.match(script, /cached release bytes passed integrity checks in this session/);
  assert.match(script, /setupOfflineMode\(\)\.finally\(\(\) => loadResearchRelease\(\)\)/);
  assert.match(script, /Back online\. Checking whether a newer verified release is available/);
  assert.match(script, /event\.data\?\.type !== 'ATLAS_OFFLINE_FALLBACK'/);
  assert.match(script, /Cached Atlas files are being rechecked before any research result is trusted/);
});

test('offline status stays touch-safe and distinct without relying on color', () => {
  assert.match(styles, /\.offline-readiness button \{ min-height:44px/);
  assert.match(styles, /@media\(max-width:520px\) \{ \.offline-readiness \{[^}]+flex-direction:column/);
  assert.match(html, />Offline research</);
});

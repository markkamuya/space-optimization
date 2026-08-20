import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { registerOfflineCache, requestOfflineCacheStatus } from '../../src/ui/offlineCache.js';

const worker = readFileSync(new URL('../../public/sw.js', import.meta.url), 'utf8');

test('offline cache is versioned, same-origin, network-first, and bounded', () => {
  assert.match(worker, /triangle-packing-atlas-offline-v1/);
  assert.match(worker, /url\.origin === self\.location\.origin/);
  assert.match(worker, /const response = await fetch\(event\.request\)/);
  assert.match(worker, /const MAX_ENTRIES = 32/);
  assert.match(worker, /keys\.slice\(0, Math\.max\(0, keys\.length - MAX_ENTRIES\)\)/);
});

test('cache misses fail explicitly instead of manufacturing verified data', () => {
  assert.match(worker, /offline_cache_miss/);
  assert.match(worker, /status: 503/);
  assert.match(worker, /Cache-Control': 'no-store/);
  assert.doesNotMatch(worker, /new Response\([^)]*atlas-v2/);
});

test('cached fallback notifies the visible UI even when browser connectivity is stale', () => {
  assert.match(worker, /ATLAS_OFFLINE_FALLBACK/);
  assert.match(worker, /self\.clients\.matchAll/);
  assert.match(worker, /await notifyFallback\(event\.request\.url\)/);
});

test('registration fails closed outside a secure supported browser', async () => {
  const original = globalThis.isSecureContext;
  Object.defineProperty(globalThis, 'isSecureContext', { value: false, configurable: true });
  assert.deepEqual(await registerOfflineCache({ register() { throw new Error('must not run'); } }), { supported: false, reason: 'unsupported' });
  Object.defineProperty(globalThis, 'isSecureContext', { value: original, configurable: true });
});

test('offline status request reports a controller absence immediately', async () => {
  assert.deepEqual(await requestOfflineCacheStatus({ controller: null }), { available: false, entries: 0, reason: 'not_controlling' });
});

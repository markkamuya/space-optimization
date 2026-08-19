import assert from 'node:assert/strict';
import test from 'node:test';
import { browserCompatibility, listenForMediaChange } from '../../src/ui/browserCompatibility.js';

function supportedEnvironment() {
  return {
    crypto: { subtle: {} }, fetch() {}, AbortController: class {}, IntersectionObserver: class {},
    HTMLDialogElement: class { showModal() {} }
  };
}

test('current Firefox, Safari, and Chromium capability contract enables verified workflows', () => {
  const report = browserCompatibility(supportedEnvironment());
  assert.equal(report.supported, true);
  assert.equal(report.canVerifyRelease, true);
  assert.deepEqual(report.missing, []);
});

test('missing integrity primitives fail closed with plain-language browser guidance', () => {
  const environment = supportedEnvironment();
  delete environment.crypto;
  const report = browserCompatibility(environment);
  assert.equal(report.supported, false);
  assert.equal(report.canVerifyRelease, false);
  assert.match(report.message, /Verified research data stays unavailable/);
  assert.match(report.message, /Firefox, Safari, or Chromium/);
});

test('media-query listeners support current and older WebKit interfaces', () => {
  let current = 0;
  let legacy = 0;
  assert.equal(listenForMediaChange({ addEventListener: () => { current += 1; } }, () => {}), 'event-listener');
  assert.equal(listenForMediaChange({ addListener: () => { legacy += 1; } }, () => {}), 'legacy-listener');
  assert.equal(current, 1);
  assert.equal(legacy, 1);
});

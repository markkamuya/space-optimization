import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { runProductionDiagnostics } from '../../src/ui/productionDiagnostics.js';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');

function element(overrides = {}) {
  return { hasAttribute: () => true, tagName: 'DIV', focus() {}, ...overrides };
}

test('live diagnostics pass a complete verified workflow without mutating it', () => {
  const document = {
    documentElement: { scrollWidth: 320, clientWidth: 320 },
    getElementById: () => element(),
    querySelector(selector) {
      if (selector === '#research-load-status') return { dataset: { releaseTrust: 'verified' } };
      if (selector === '#record-dialog') return element({ tagName: 'DIALOG' });
      return element();
    },
    querySelectorAll: () => [element()]
  };
  const report = runProductionDiagnostics(document, { crypto: { subtle: { digest() {} } }, TextEncoder });
  assert.equal(report.passed, true);
  assert.deepEqual(report.failures, []);
});

test('live diagnostics surface overflow and missing verification', () => {
  const document = {
    documentElement: { scrollWidth: 401, clientWidth: 390 },
    getElementById: () => element(),
    querySelector(selector) {
      if (selector === '#research-load-status') return { dataset: { releaseTrust: 'modeled' } };
      if (selector === '#record-dialog') return element({ tagName: 'DIALOG' });
      return element();
    },
    querySelectorAll: () => [element()]
  };
  const report = runProductionDiagnostics(document, { crypto: { subtle: { digest() {} } }, TextEncoder });
  assert.equal(report.passed, false);
  assert.deepEqual(report.failures, ['verifiedRelease', 'viewportFit']);
});

test('production exposes non-destructive diagnostics and visible outcomes', () => {
  assert.match(html, /id="browser-diagnostics-run"/);
  assert.match(html, /id="browser-diagnostics-status" role="status" aria-live="polite"/);
  assert.match(script, /runProductionDiagnostics\(document\)/);
  assert.match(script, /Verified data remains fail-closed/);
});

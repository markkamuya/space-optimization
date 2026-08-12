import assert from 'node:assert/strict';
import test from 'node:test';
import { escapeHtml, safeExternalUrl } from '../../src/ui/safeText.js';

test('dataset text cannot inject markup', () => {
  assert.equal(escapeHtml('<img src=x onerror="alert(1)">'), '&lt;img src=x onerror=&quot;alert(1)&quot;&gt;');
});

test('external dataset links allow only web URLs', () => {
  assert.equal(safeExternalUrl('javascript:alert(1)'), '#');
  assert.equal(safeExternalUrl('not a url'), '#');
  assert.equal(safeExternalUrl('https://example.org/paper'), 'https://example.org/paper');
});

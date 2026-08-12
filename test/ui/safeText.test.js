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

test('all public dataset rendering paths use HTML escaping', async () => {
  const source = await import('node:fs/promises').then(({ readFile }) =>
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'));
  for (const field of [
    'record.evidence.claim',
    'record.provenance.contributor',
    'record.reproducibility.command',
    'transition.evidence.join',
    'problem.question'
  ]) assert.match(source, new RegExp(`escapeHtml\\(${field.replaceAll('.', '\\.')}`));
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
test('mobile result wrappers stretch cards without fixed widths', () => {
  assert.match(css, /\.registry-results \.research-result-item\{display:grid;min-width:0\}/);
  assert.match(css, /\.registry-results \.research-result-item button\{width:auto;min-width:0\}/);
});
test('mobile record identities wrap instead of losing their suffix', () => {
  assert.match(css, /\.registry-results \.research-result-item small\{overflow:visible;white-space:normal;overflow-wrap:anywhere\}/);
  assert.match(css, /\.registry-results \.research-result-item span\{font-size:14px\}/);
});

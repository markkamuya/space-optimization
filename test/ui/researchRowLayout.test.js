import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const css = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');
const main = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
test('result cards label evidence and bounds without promising improvement', () => {
  const row = main.slice(main.indexOf('const rowUpdate = renderResearchRows'), main.indexOf('if (!visible.length)'));
  for (const label of ['Pattern:', 'Evidence:', 'Filled:', 'Gap to upper bound:']) assert.ok(row.includes(label));
  assert.ok(row.includes('record.verification.utilization'));
  assert.ok(row.includes('record.bounds.optimalityGap'));
  assert.doesNotMatch(row, /possible gain|guaranteed improvement/i);
});
test('mobile result wrappers stretch cards without fixed widths', () => {
  assert.match(css, /\.registry-results \.research-result-item\{display:grid;min-width:0\}/);
  assert.match(css, /\.registry-results \.research-result-item button\{width:auto;min-width:0\}/);
});
test('mobile record identities wrap instead of losing their suffix', () => {
  assert.match(css, /\.registry-results \.research-result-item small\{overflow:visible;white-space:normal;overflow-wrap:anywhere\}/);
  assert.match(css, /\.registry-results \.research-result-item span\{font-size:14px\}/);
});

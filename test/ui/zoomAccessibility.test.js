import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

test('effective 400 percent zoom collapses research workflows to one column', () => {
  const compact = styles.match(/@media\(max-width:480px\)\{([\s\S]*?)\n\}/)?.[1] ?? '';
  assert.match(compact, /body\{min-width:0\}/);
  assert.match(compact, /\.research-summary\{grid-template-columns:1fr\}/);
  assert.match(compact, /\.workspace-rail\{grid-template-columns:1fr\}/);
  assert.match(compact, /dialog\{width:100vw;max-width:100vw;max-height:100dvh\}/);
  assert.match(compact, /\.detail-navigation\{grid-template-columns:1fr/);
});

test('system contrast and motion preferences retain visible interaction state', () => {
  assert.match(styles, /@media\(prefers-reduced-motion:reduce\)/);
  assert.match(styles, /@media\(prefers-contrast:more\)/);
  assert.match(styles, /@media\(forced-colors:active\)/);
  assert.match(styles, /outline:3px solid Highlight/);
  assert.match(styles, /background:Highlight/);
});

test('production certification states its enlarged and assistive technology scope', () => {
  assert.match(html, /keyboard and screen-reader operation/);
  assert.match(html, /up to 400% zoom/);
  assert.match(html, /high contrast/);
});

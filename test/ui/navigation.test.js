import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('homepage provides descriptive navigation and mobile menu semantics', async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(html, /Skip to main content/);
  assert.match(html, /aria-controls="primary-nav"/);
  for (const label of ['Try the map', 'Browse packings', 'Search all results', 'Open challenges']) {
    assert.match(html, new RegExp(label));
  }
  assert.match(script, /aria-expanded/);
  assert.match(script, /aria-pressed/);
  assert.match(script, /dialogTrigger\.focus/);
  assert.match(script, /history\.replaceState\(null, '', dialogReturnHash\)/);
  assert.match(styles, /\.topbar nav\.open/);
});

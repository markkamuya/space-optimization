import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('packing map exposes a keyboard grid and equivalent textual evidence', async () => {
  const [html, script, styles, gridModule] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../../src/ui/phaseGrid.js', import.meta.url), 'utf8')
  ]);

  assert.match(html, /role="grid"/);
  assert.match(html, /id="phase-grid-help"/);
  assert.match(html, /id="phase-summary"[^>]+role="status"/);
  assert.match(html, /aria-describedby="phase-summary"/);
  assert.match(script, /role', 'gridcell'/);
  assert.match(script, /aria-selected/);
  for (const key of ['ArrowRight', 'ArrowLeft', 'ArrowDown', 'ArrowUp']) assert.match(gridModule, new RegExp(key));
  assert.match(script, /event\.key === 'Enter' \|\| event\.key === ' '/);
  assert.match(script, /syncPhaseGridSelection/);
  assert.match(styles, /phase-cell\[aria-selected="true"\]/);
  assert.match(styles, /\.sr-only/);
});

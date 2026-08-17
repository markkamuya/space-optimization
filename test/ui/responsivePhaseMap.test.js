import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('phase map exposes progressive detail with responsive touch controls', async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /Representative overview/);
  assert.match(html, /All verified samples/);
  assert.match(html, /data-phase-view="overview" aria-pressed="true"/);
  assert.match(html, /id="phase-view-status" role="status"/);
  assert.match(script, /phaseMapRecords\(researchRelease\.records, phaseMapView\)/);
  assert.match(script, /Sliders and evidence use all/);
  assert.match(script, /button\.setAttribute\('aria-pressed'/);
  assert.match(styles, /\.phase-view-controls button \{ min-height:44px/);
  assert.match(styles, /\.phase-view-controls\{align-items:stretch;flex-direction:column\}/);
});

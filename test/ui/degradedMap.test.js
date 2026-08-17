import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('map exposes the same fail-closed release state and retry as research results', async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(html, /id="map-data-status"[^>]+role="status"/);
  assert.match(html, /MODELED PREVIEW/);
  assert.match(script, /releaseExperience\(/);
  assert.match(script, /MODELED PREVIEW · NOT VERIFIED DATA/);
  assert.match(script, /BEST VERIFIED SAMPLE/);
  assert.match(script, /evidence\.removeAttribute\('href'\)/);
  assert.match(script, /evidence\.setAttribute\('aria-disabled', 'true'\)/);
  assert.match(script, /Check for release updates/);
  assert.match(script, /#map-data-status/);
  assert.match(styles, /\.map-data-status button \{ min-height:44px/);
  assert.match(styles, /\.map-next-actions \[aria-disabled="true"\]/);
});

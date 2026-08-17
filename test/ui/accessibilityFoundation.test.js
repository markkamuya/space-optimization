import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('production navigation supports escape, focus return, touch, and motion preferences', async () => {
  const [script, styles] = await Promise.all([
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);

  assert.match(script, /function closePrimaryNavigation/);
  assert.match(script, /event\.key === 'Escape'/);
  assert.match(script, /restoreFocus: true/);
  assert.match(script, /pointerdown/);
  assert.match(script, /min-width: 721px/);
  assert.match(script, /trapPrimaryNavigationFocus/);
  assert.match(script, /setNavigationIsolation/);
  assert.match(script, /toggleAttribute\('inert', isolated\)/);
  assert.match(script, /setCurrentNavigationTask/);
  assert.match(script, /aria-current/);
  assert.match(script, /IntersectionObserver/);
  assert.match(script, /restoreInitialTaskAnchor/);
  assert.match(script, /scrollIntoView/);
  assert.match(styles, /min-height:44px/);
  assert.match(styles, /scroll-padding-top:84px/);
  assert.match(styles, /prefers-reduced-motion:reduce/);
  assert.match(styles, /forced-colors:active/);
  assert.match(styles, /aria-current="location"/);
});

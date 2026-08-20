import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import { atlasModeForHash, formatCompassHash, parseCompassHash } from '../../src/ui/packingCompassShell.js';

test('guided mode is the default while legacy research links retain advanced mode', () => {
  assert.equal(atlasModeForHash(''), 'guided');
  assert.equal(atlasModeForHash('#compass?goal=find'), 'guided');
  for (const hash of ['#map', '#research?record=iso-a60-r1p5', '#compare', '#challenges']) {
    assert.equal(atlasModeForHash(hash), 'advanced');
  }
});

test('packing compass goal links are bounded and backward safe', () => {
  assert.equal(formatCompassHash('verify'), '#compass?goal=verify');
  assert.deepEqual(parseCompassHash('#compass?goal=compare'), { goal: 'compare' });
  assert.deepEqual(parseCompassHash('#compass?goal=unknown'), { goal: null });
  assert.deepEqual(parseCompassHash('#research?q=right'), { goal: null });
});

test('production page exposes one task-first guided shell and an advanced escape hatch', async () => {
  const [html, styles] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(html, /<section id="compass" class="packing-compass" aria-labelledby="compass-title">/);
  assert.match(html, /What are you trying to discover\?/);
  assert.equal((html.match(/data-compass-goal=/g) ?? []).length, 4);
  assert.match(html, /id="atlas-mode-toggle"[^>]+aria-pressed="false"/);
  assert.match(styles, /\.guided-mode main>:not\(#top\):not\(#browser-compatibility\):not\(#compass\)/);
  assert.match(styles, /\.guided-mode \.topbar nav,\.guided-mode \.contribute-link,\.guided-mode \.nav-toggle/);
  assert.match(styles, /@media\(max-width:720px\).*\.compass-goals\{grid-template-columns:1fr/s);
});

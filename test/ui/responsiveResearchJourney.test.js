import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('primary research journey follows explore, inspect, compare, improve order', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  const map = html.indexOf('<section id="map"');
  const research = html.indexOf('<section id="research"');
  const compare = html.indexOf('<section id="compare"');
  const challenges = html.indexOf('<section id="challenges"');

  assert.ok(map > 0 && map < research && research < compare && compare < challenges);
  for (const step of ['1 · Explore packings', '2 · Verify a claim', '3 · Compare evidence', '4 · Improve a result']) {
    assert.match(html, new RegExp(step));
  }
  assert.match(html, /<a href="#map">Explore<\/a><a href="#research">Verify evidence<\/a><a href="#compare">Compare<\/a>/);
  assert.match(html, /<nav class="workspace-rail" aria-label="Research workspace steps">/);
});

test('workspace context remains touch safe without trapping narrow layouts', async () => {
  const [script, styles] = await Promise.all([
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(script, /#primary-nav a, \.workspace-rail a/);
  assert.match(styles, /\.workspace-rail \{ position:sticky/);
  assert.match(styles, /@media\(max-width:720px\)\{\.workspace-rail\{position:static;grid-template-columns:1fr 1fr\}/);
  assert.match(styles, /\.workspace-rail a\{min-height:48px\}/);
});

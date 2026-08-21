import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('production exposes an evidence-safe browser Packing Workshop', async () => {
  const [html, script, styles, shell] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8'),
    readFile(new URL('../../src/ui/packingCompassShell.js', import.meta.url), 'utf8')
  ]);
  assert.match(html, /<section id="workshop" class="packing-workshop" aria-labelledby="workshop-title">/);
  for (const promise of [
    'Nothing here changes the published record',
    'Run local validation before drawing any conclusion',
    'Published evidence remains authoritative',
    'Wait for independent verification and maintainer review before claiming improvement or proof'
  ]) assert.match(html, new RegExp(promise));
  for (const control of ['workshop-placement', 'workshop-x', 'workshop-y', 'workshop-angle', 'workshop-validate', 'workshop-save', 'workshop-recover', 'workshop-export', 'workshop-github']) {
    assert.match(html, new RegExp(`id="${control}"`));
  }
  assert.match(html, /Angle \(radians\)/);
  assert.match(script, /validateWorkshopCandidate\(workshopCandidate, baseline, canonicalRelease\.records\)/);
  assert.match(script, /restoreWorkshopBundle/);
  assert.match(script, /aria-disabled', String\(!validation\.eligibleForContribution\)/);
  assert.match(script, /All .* allowed piece slots are already used/);
  assert.match(shell, /destination: '#workshop'/);
  assert.match(styles, /\.workshop-layout button,.workshop-export-actions a \{ min-height:44px/);
  assert.match(styles, /@media\(max-width:720px\).*\.workshop-coordinate-grid.*grid-template-columns:1fr/s);
});

test('Packing Compass moves keyboard focus to visible goal content', async () => {
  const shell = await readFile(new URL('../../src/ui/packingCompassShell.js', import.meta.url), 'utf8');
  assert.match(shell, /workspace\.scrollIntoView\(\{ block: 'start' \}\)/);
  assert.match(shell, /title\.focus\(\{ preventScroll: true \}\)/);
  assert.ok(shell.indexOf('workspace.scrollIntoView') < shell.indexOf("title.focus({ preventScroll: true })"));
});

test('Workshop remains an advanced route while Packing Compass stays the home', async () => {
  const [html, styles] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);
  assert.ok(html.indexOf('id="compass"') < html.indexOf('id="workshop"'));
  assert.match(html, /href="#workshop">Packing Workshop/);
  assert.match(styles, /\.guided-mode main>:not\(#top\):not\(#browser-compatibility\):not\(#compass\) \{ display:none; \}/);
});

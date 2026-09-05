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
  for (const control of ['workshop-undo', 'workshop-redo']) assert.match(html, new RegExp(`id="${control}"`));
  for (const control of ['workshop-candidate-export', 'workshop-review-export']) assert.match(html, new RegExp(`id="${control}"`));
  assert.match(html, /id="workshop-github-copy"/);
  assert.match(html, /id="workshop-journey" class="workshop-journey" aria-label="Packing Workshop steps"/);
  for (const step of ['workshop-baseline-title', 'workshop-editor-title', 'workshop-validation-title', 'workshop-handoff-title']) {
    assert.match(html, new RegExp(`data-workshop-step="${step}"`));
    assert.match(html, new RegExp(`id="${step}" tabindex="-1"`));
  }
  assert.match(html, /data-workshop-step="workshop-baseline-title" aria-current="step"/);
  assert.match(html, /Angle \(radians\)/);
  assert.match(html, /tabindex="0" aria-label="Interactive Packing Workshop candidate"/);
  assert.match(html, /Arrow keys move the selected triangle by 0\.01/);
  assert.match(script, /validateWorkshopCandidate\(workshopCandidate, baseline, canonicalRelease\.records\)/);
  assert.match(script, /workshopPlacementAtPoint/);
  assert.match(script, /addEventListener\('pointermove'/);
  assert.match(script, /workshopKeyboardPatch/);
  assert.match(script, /scheduleWorkshopRecovery/);
  assert.match(script, /scheduleWorkshopValidation/);
  assert.match(script, /setTimeout\(async \(\) =>/);
  assert.match(script, /setTimeout\(\(\) =>/);
  assert.match(script, /:autosave/);
  assert.match(script, /createWorkshopReviewPacket/);
  assert.match(script, /workshopReviewMarkdown/);
  assert.match(script, /resolveWorkshopChallenge/);
  assert.match(script, /workshopGitHubSummary/);
  assert.match(script, /workshopJourneyState/);
  assert.match(script, /workshopPreservation/);
  assert.match(script, /#workshop-journey.*addEventListener\('click'/);
  assert.match(script, /removeAttribute\('aria-current'\)/);
  assert.match(script, /target\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /restoreWorkshopBundle/);
  assert.match(script, /aria-disabled', String\(!reviewReady\)/);
  assert.match(script, /All .* allowed piece slots are already used/);
  assert.match(shell, /destination: '#workshop'/);
  assert.match(styles, /\.workshop-layout button,.workshop-export-actions a \{ min-height:44px/);
  assert.match(styles, /#workshop-canvas:focus-visible/);
  assert.match(styles, /touch-action:none/);
  assert.match(styles, /\.workshop-journey button\[aria-current="step"\]/);
  assert.match(styles, /\.workshop-journey button\[data-state="needs-attention"\]/);
  assert.match(styles, /@media\(max-width:720px\).*\.workshop-journey ol\{grid-template-columns:1fr 1fr\}/s);
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

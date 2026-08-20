import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');
const styles = readFileSync(new URL('../../styles.css', import.meta.url), 'utf8');

test('portable session controls explain scope and remain disabled until verification', () => {
  assert.match(html, /aria-labelledby="session-tools-title"/);
  assert.match(html, /stores research context—not new scientific evidence/);
  assert.match(html, /id="session-download"[^>]+disabled/);
  assert.match(html, /id="session-file"[^>]+disabled/);
  assert.match(html, /id="session-status" role="status" aria-live="polite" aria-atomic="true" tabindex="-1"/);
});

test('session export includes all research workflows and verified identity', () => {
  assert.match(script, /map: currentMapState\(\)/);
  assert.match(script, /research: currentResearchState\(\)/);
  assert.match(script, /comparison: currentComparisonState\(\)/);
  assert.match(script, /shortlist: comparisonWorkspaceIds/);
  assert.match(script, /createResearchSession\(currentPortableSession\(\), canonicalRelease, releaseIntegrity/);
});

test('session import is bounded, fail-closed, and announces partial recovery', () => {
  assert.match(script, /file\.size > 64 \* 1024/);
  assert.match(script, /No research context was changed/);
  assert.match(script, /applyMapState\(result\.session\.map\)/);
  assert.match(script, /applyResearchState\(result\.session\.research\)/);
  assert.match(script, /applyComparisonState\(result\.session\.comparison\)/);
  assert.match(script, /result\.removed/);
  assert.match(script, /status\.focus\(\{ preventScroll: true \}\)/);
});

test('session actions collapse to a touch-safe mobile flow', () => {
  assert.match(styles, /@media\(max-width:720px\)\{\.session-tools\{margin-inline:24px;grid-template-columns:1fr\}/);
  assert.match(styles, /\.session-actions button,\.session-actions label \{ display:flex; min-height:44px/);
});

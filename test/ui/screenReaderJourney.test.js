import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../../index.html', import.meta.url), 'utf8');
const script = readFileSync(new URL('../../src/main.js', import.meta.url), 'utf8');

test('primary research workflows expose named semantic regions', () => {
  assert.match(html, /id="research"[^>]+aria-labelledby="research-title"/);
  assert.match(html, /id="compare"[^>]+aria-labelledby="compare-title"/);
  assert.match(html, /id="contribute"[^>]+aria-labelledby="contribute-title"/);
  assert.match(html, /id="comparison"[^>]+role="region"[^>]+aria-label="Verified comparison details"/);
  assert.match(html, /id="contribution-preflight-results"[^>]+role="region"[^>]+aria-label="Contribution preflight results"/);
});

test('announcements are limited to focused status messages', () => {
  assert.doesNotMatch(html, /id="research-summary"[^>]+aria-live/);
  assert.doesNotMatch(html, /id="research-results"[^>]+aria-live/);
  assert.doesNotMatch(html, /id="comparison-workspace-list"[^>]+aria-live/);
  assert.doesNotMatch(html, /id="contribution-preflight-results"[^>]+aria-live/);
  assert.match(html, /id="research-result-count"[^>]+role="status"[^>]+aria-live="polite"[^>]+aria-atomic="true"/);
});

test('research rows are announced as a list of actionable results', () => {
  assert.match(html, /id="research-results"[^>]+role="list"[^>]+aria-label="Verified research results"/);
  assert.match(script, /class="research-result-item" role="listitem"><button type="button" data-record=/);
});

test('packing canvases have an equivalent textual research summary', () => {
  assert.match(script, /id="record-visual-summary" class="sr-only">Packing diagram/);
  assert.match(script, /role="img" aria-label="\$\{escapeHtml\(record\.id\)\} packing coordinates" aria-describedby="record-visual-summary"/);
});

test('comparison cards have programmatic headings', () => {
  assert.match(script, /<article aria-labelledby="comparison-record-\$\{index\}">/);
  assert.match(script, /<h3 id="comparison-record-\$\{index\}">/);
});

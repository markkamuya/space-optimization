import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('advanced Atlas keeps essential decisions visible and specialist detail optional', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  assert.match(html, /class="map-essential-facts"[\s\S]*id="phase-status"[\s\S]*id="phase-fill"[\s\S]*id="phase-gap"/);
  assert.match(html, /<details class="precision-disclosure">[\s\S]*More precision[\s\S]*id="phase-distance"/);
  assert.match(html, /<details class="research-technical" id="research-technical">[\s\S]*Technical files/);
  assert.match(html, /<details class="proof-disclosure">[\s\S]*Machine-checkable proof scope/);
  assert.doesNotMatch(html, /<details[^>]+open/);
});

test('native disclosures retain keyboard-sized targets and responsive explanations', async () => {
  const styles = await readFile(new URL('../../styles.css', import.meta.url), 'utf8');
  assert.match(styles, /\.precision-disclosure summary,[^{]+\{ min-height:44px/);
  assert.match(styles, /\.research-technical \.research-downloads a \{ display:inline-flex; min-height:44px/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('homepage provides descriptive navigation and mobile menu semantics', async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(html, /Skip to main content/);
  assert.match(html, /aria-controls="primary-nav"/);
  for (const label of ['Explore', 'Compare', 'Verify evidence', 'Improve records', 'Contribute']) {
    assert.match(html, new RegExp(label));
  }
  assert.match(html, /aria-label="Start a research task"/);
  assert.match(html, /<dialog id="record-dialog" aria-labelledby="record-dialog-title" aria-describedby="record-dialog-summary">/);
  assert.match(html, /aria-label="Close result details" autofocus/);
  for (const task of ['Explore packings', 'Compare evidence', 'Verify a claim', 'Improve a result']) {
    assert.match(html, new RegExp(task));
  }
  assert.match(script, /aria-expanded/);
  assert.match(script, /aria-pressed/);
  assert.match(script, /dialog\.querySelector\('\.dialog-close'\)\.focus\(\{ preventScroll: true \}\)/);
  assert.match(script, /dialogTrigger\?\.isConnected \? dialogTrigger : \$\('#research-search'\)/);
  assert.match(script, /history\.replaceState\(null, '', dialogReturnHash\)/);
  assert.match(styles, /\.topbar nav\.open/);
  assert.match(html, /FINITE-DOMAIN PROOFS/);
  assert.match(html, /PROOF CHECKPOINTS/);
  assert.match(html, /Machine-checkable finite-domain proofs/);
  assert.match(script, /not a claim about the global optimum/);
  assert.match(script, /Completed and replayable/);
  assert.match(script, /integrity-checked shards/);
  assert.match(script, /checksum-checked fallback/);
  assert.match(script, /partial or unverified data is never presented as trustworthy/);
});

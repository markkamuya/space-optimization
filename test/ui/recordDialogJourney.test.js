import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('record inspection preserves filters and exposes accessible sequential navigation', async () => {
  const [html, script, styles] = await Promise.all([
    readFile(new URL('../../index.html', import.meta.url), 'utf8'),
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(html, /aria-labelledby="record-dialog-title" aria-describedby="record-dialog-summary"/);
  assert.match(script, /filteredResearchRecords\(\)/);
  assert.match(script, /aria-label="Browse filtered results"/);
  assert.match(script, /Result \$\{index \+ 1\} of \$\{records\.length\} in the current filters/);
  assert.match(script, /openResearchRecord\(record, \{ preserveContext: true \}\)/);
  assert.match(script, /if \(!dialog\.open\) dialog\.showModal\(\)/);
  assert.match(script, /This linked result is outside the current filters/);
  assert.match(styles, /\.detail-navigation button \{ min-height:44px/);
  assert.match(styles, /@media\(max-width:720px\)\{\.detail-navigation/);
});

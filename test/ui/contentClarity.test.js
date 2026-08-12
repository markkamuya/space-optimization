import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('homepage explains the atlas and evidence in plain language', async () => {
  const html = await readFile(new URL('../../index.html', import.meta.url), 'utf8');
  for (const phrase of [
    'See how triangles',
    'Try the packing map',
    'It does not claim that every result is optimal',
    'Room for improvement',
    'Submit the triangle coordinates as JSON'
  ]) assert.match(html, new RegExp(phrase));
  for (const phrase of ['THE SIGNATURE VIEW', 'starting territories', 'shared instrument', 'not a gallery']) {
    assert.doesNotMatch(html, new RegExp(phrase, 'i'));
  }
});

import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const packageJson = JSON.parse(readFileSync(new URL('../../package.json', import.meta.url), 'utf8'));
const script = readFileSync(new URL('../../scripts/certify-visual-ui.js', import.meta.url), 'utf8');

test('visual certification fingerprints critical layouts and user preferences', () => {
  assert.equal(packageJson.scripts['atlas:visual-certify'], 'node scripts/certify-visual-ui.js');
  assert.match(script, /desktop: digest/);
  assert.match(script, /responsive: digest/);
  assert.match(script, /preferences: digest/);
  assert.match(script, /landmarks: digest/);
  assert.match(script, /triangle-packing-atlas-visual-contract\/v1/);
});

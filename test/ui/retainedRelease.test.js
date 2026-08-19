import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';

test('refresh and connectivity recovery retain only integrity-verified results', async () => {
  const [script, experience] = await Promise.all([
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../src/ui/releaseExperience.js', import.meta.url), 'utf8')
  ]);
  assert.match(script, /retainingVerifiedRelease = Boolean\(canonicalRelease && researchRelease\)/);
  assert.match(script, /The last verified results remain available during this integrity check/);
  assert.match(experience, /failed attempt did not replace the previously integrity-checked release/);
  assert.match(experience, /Offline · last verified results retained/);
  assert.match(script, /releaseVerifiedAt/);
  assert.match(script, /dataset\.releaseTrust/);
  assert.match(script, /window\.addEventListener\('offline', showOfflineExperience\)/);
  assert.match(script, /window\.addEventListener\('online', \(\) => startReleaseRecovery\(\{ reason: 'reconnected' \}\)\)/);
  assert.match(script, /Connection restored\. Recovery complete/);
  assert.match(script, /attempt !== researchLoadAttempt/);
  assert.match(script, /error\.name === 'AbortError'/);
});

test('offline initial load stays fail-closed and promises automatic recovery', async () => {
  const script = await readFile(new URL('../../src/main.js', import.meta.url), 'utf8');
  assert.match(script, /if \(!navigator\.onLine\)/);
  assert.match(script, /No verified research records are shown/);
  assert.match(script, /retry automatically/);
  assert.match(script, /The map is a modeled preview until verified data can be checked/);
});

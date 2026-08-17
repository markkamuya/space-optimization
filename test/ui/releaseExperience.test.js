import assert from 'node:assert/strict';
import test from 'node:test';
import { releaseExperience } from '../../src/ui/releaseExperience.js';

test('initial loading and failure never present modeled data as verified', () => {
  const loading = releaseExperience({ phase: 'loading' });
  const failed = releaseExperience({ phase: 'failed' });
  assert.equal(loading.mode, 'loading');
  assert.equal(loading.canUseVerified, false);
  assert.match(loading.detail, /modeled preview/);
  assert.equal(failed.mode, 'failed_empty');
  assert.equal(failed.canUseVerified, false);
  assert.equal(failed.canRetry, true);
});

test('offline and failed refreshes preserve only a previously verified release', () => {
  const offline = releaseExperience({ phase: 'ready', hasVerifiedRelease: true, online: false });
  const failed = releaseExperience({ phase: 'failed', hasVerifiedRelease: true });
  assert.equal(offline.mode, 'offline_retained');
  assert.equal(offline.preserveVerified, true);
  assert.equal(offline.canRetry, false);
  assert.equal(failed.mode, 'failed_retained');
  assert.equal(failed.canUseVerified, true);
  assert.match(failed.detail, /did not replace/);
});

test('ready state distinguishes shard verification from checksum fallback', () => {
  assert.equal(releaseExperience({ phase: 'ready', source: 'verified_shards' }).mode, 'verified_shards');
  assert.equal(releaseExperience({ phase: 'ready', source: 'verified_monolith_fallback' }).mode, 'verified_fallback');
});

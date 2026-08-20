import assert from 'node:assert/strict';
import test from 'node:test';
import { releaseExperience } from '../../src/ui/releaseExperience.js';

test('initial loading and failure never present modeled data as verified', () => {
  const loading = releaseExperience({ phase: 'loading' });
  const failed = releaseExperience({ phase: 'failed' });
  assert.equal(loading.mode, 'loading');
  assert.equal(loading.canUseVerified, false);
  assert.equal(loading.label, 'Checking');
  assert.equal(loading.trust, 'unavailable');
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
  assert.equal(failed.label, 'Retained verified');
  assert.equal(failed.trust, 'retained');
  assert.match(failed.detail, /did not replace/);
});

test('ready state distinguishes shard verification from checksum fallback', () => {
  assert.equal(releaseExperience({ phase: 'ready', source: 'verified_shards' }).mode, 'verified_shards');
  assert.equal(releaseExperience({ phase: 'ready', source: 'verified_monolith_fallback' }).mode, 'verified_fallback');
});

test('session provenance says when verified data was checked without implying stale data is current', () => {
  const ready = releaseExperience({ phase: 'ready', source: 'verified_shards', verifiedAt: '3:42 PM' });
  const retained = releaseExperience({ phase: 'failed', hasVerifiedRelease: true, verifiedAt: '3:42 PM' });
  assert.equal(ready.provenance, 'Integrity checked this session at 3:42 PM');
  assert.equal(retained.provenance, 'Last integrity check this session: 3:42 PM');
});

test('a long-open verified tab requests a non-destructive freshness check', () => {
  const experience = releaseExperience({ phase: 'ready', hasVerifiedRelease: true, source: 'verified_shards', online: true, verifiedAt: '10:00 AM', freshness: { recheckDue: true } });
  assert.equal(experience.mode, 'recheck_due');
  assert.equal(experience.preserveVerified, true);
  assert.equal(experience.canUseVerified, true);
  assert.equal(experience.canRetry, true);
  assert.match(experience.detail, /remain integrity-checked/i);
});

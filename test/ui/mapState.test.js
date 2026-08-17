import assert from 'node:assert/strict';
import test from 'node:test';
import { formatMapHash, parseMapHash } from '../../src/ui/mapState.js';

test('map selections round-trip through a deterministic shareable hash', () => {
  const state = { angle: 90, ratio: 2.25, record: 'atlas-v2-right-a90-r2-25', view: 'all' };
  const hash = formatMapHash(state);
  assert.equal(hash, '#map?angle=90&ratio=2.25&record=atlas-v2-right-a90-r2-25&view=all');
  assert.deepEqual(parseMapHash(hash), state);
});

test('legacy map links preserve the original default selection', () => {
  assert.deepEqual(parseMapHash('#map'), { angle: 60, ratio: 1.5, record: null, view: 'overview' });
  assert.equal(formatMapHash({ angle: 60, ratio: 1.5 }), '#map');
});

test('malformed and out-of-domain map links recover to safe sampled controls', () => {
  assert.deepEqual(parseMapHash('#map?angle=oops&ratio=9'), { angle: 60, ratio: 3, record: null, view: 'overview' });
  assert.deepEqual(parseMapHash('#map?angle=92.7&ratio=1.63'), { angle: 93, ratio: 1.65, record: null, view: 'overview' });
});

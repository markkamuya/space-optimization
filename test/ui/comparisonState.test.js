import assert from 'node:assert/strict';
import test from 'node:test';
import { formatComparisonHash, parseComparisonHash, resolveComparisonState } from '../../src/ui/comparisonState.js';

test('comparison selections round-trip through a deterministic shareable hash', () => {
  const state = { left: 'iso-a90-r1p5', right: 'iso-a110-r3' };
  assert.equal(formatComparisonHash(state), '#compare?a=iso-a90-r1p5&b=iso-a110-r3');
  assert.deepEqual(parseComparisonHash(formatComparisonHash(state)), state);
});

test('legacy comparison links retain safe defaults', () => {
  assert.deepEqual(parseComparisonHash('#compare'), { left: null, right: null });
  assert.equal(formatComparisonHash({}), '#compare');
});

test('unknown and oversized record ids cannot displace verified defaults', () => {
  const defaults = { left: 'verified-a', right: 'verified-b' };
  const state = parseComparisonHash(`#compare?a=forged&b=${'x'.repeat(200)}`);
  assert.deepEqual(resolveComparisonState(state, new Set(['verified-a', 'verified-b']), defaults), defaults);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { freshnessDelay, RELEASE_FRESHNESS_WINDOW_MS, releaseFreshness } from '../../src/ui/releaseFreshness.js';

test('freshness changes only after the bounded long-session window', () => {
  assert.equal(releaseFreshness(1_000, 1_000 + RELEASE_FRESHNESS_WINDOW_MS - 1, true).state, 'fresh');
  const due = releaseFreshness(1_000, 1_000 + RELEASE_FRESHNESS_WINDOW_MS, true);
  assert.equal(due.state, 'recheck_due');
  assert.equal(due.recheckDue, true);
});

test('offline sessions retain verified data without requesting network work', () => {
  const state = releaseFreshness(1_000, 1_000 + RELEASE_FRESHNESS_WINDOW_MS * 2, false);
  assert.equal(state.state, 'offline');
  assert.equal(state.recheckDue, false);
});

test('watchdog schedules once and fails closed without a verified timestamp', () => {
  assert.equal(freshnessDelay(1_000, 2_000), RELEASE_FRESHNESS_WINDOW_MS - 1_000);
  assert.equal(freshnessDelay(1_000, 1_000 + RELEASE_FRESHNESS_WINDOW_MS + 5), 0);
  assert.equal(freshnessDelay(null, 2_000), null);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { workshopRecoveryState } from '../../src/ui/workshopRecoveryState.js';

test('recovery stays unavailable until a verified baseline is ready', () => {
  const state = workshopRecoveryState({ available: true });
  assert.equal(state.available, false);
  assert.match(state.status, /verified baseline/);
});

test('recovery distinguishes no copy from an available checksummed copy', () => {
  assert.equal(workshopRecoveryState({ baselineReady: true }).label, 'No recovery copy');
  const available = workshopRecoveryState({ baselineReady: true, available: true });
  assert.equal(available.available, true);
  assert.match(available.status, /checksummed recovery copy/);
});

test('recovery warns before replacing dirty local edits', () => {
  const state = workshopRecoveryState({ baselineReady: true, available: true, dirty: true });
  assert.match(state.status, /replace the current local edits/);
  assert.doesNotMatch(state.status, /verified|published improvement/i);
});

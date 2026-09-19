import assert from 'node:assert/strict';
import test from 'node:test';
import { workshopContinuityState } from '../../src/ui/workshopContinuity.js';

test('Workshop continuity remains blocked without an integrity-checked baseline', () => {
  assert.deepEqual(workshopContinuityState(), {
    state: 'blocked',
    action: 'none',
    label: 'Waiting for verified baseline',
    status: 'A verified baseline must load before the Workshop can suggest a next step.'
  });
});

test('Workshop continuity advances through adjust, check, repair, preserve, and review', () => {
  assert.equal(workshopContinuityState({ baselineReady: true }).action, 'exact');
  assert.equal(workshopContinuityState({ baselineReady: true, dirty: true }).action, 'validate');
  assert.equal(workshopContinuityState({ baselineReady: true, dirty: true, validation: { geometryValid: false } }).action, 'findings');
  assert.equal(workshopContinuityState({ baselineReady: true, dirty: true, validation: { geometryValid: true } }).action, 'save');
  assert.equal(workshopContinuityState({ baselineReady: true, dirty: true, validation: { geometryValid: true }, preservation: 'saved' }).action, 'review');
});

test('Workshop continuity never describes local validation as proof or publication', () => {
  const state = workshopContinuityState({ baselineReady: true, dirty: true, validation: { geometryValid: true } });
  assert.match(state.status, /still-unverified/);
  assert.doesNotMatch(state.status, /proven|published improvement/i);
});

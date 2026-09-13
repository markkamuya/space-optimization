import assert from 'node:assert/strict';
import test from 'node:test';
import { workshopContributionState } from '../../src/ui/workshopContributionState.js';

const eligible = { eligibleForContribution: true };
const challenge = { challengeId: 'TPA-C01', issueUrl: 'https://github.com/markkamuya/space-optimization/issues/1' };

test('unvalidated and failed candidates keep every contribution action fail-closed', () => {
  for (const validation of [null, { eligibleForContribution: false }]) {
    const state = workshopContributionState({ validation, challenge });
    assert.equal(state.state, 'locked');
    assert.equal(state.githubHref, null);
    assert.equal(Object.values(state.actions).every(value => value === false), true);
  }
});

test('eligible candidates without an exact challenge can export but cannot imply a GitHub destination', () => {
  const state = workshopContributionState({ validation: eligible });
  assert.equal(state.state, 'unbound');
  assert.equal(state.actions.exportCandidate, true);
  assert.equal(state.actions.openGitHub, false);
  assert.equal(state.githubHref, null);
  assert.match(state.status, /maintainer guidance/i);
});

test('exact challenge binding unlocks review actions while external review stays incomplete', () => {
  const before = workshopContributionState({ validation: eligible, challenge });
  assert.equal(before.githubHref, challenge.issueUrl);
  assert.equal(before.actions.copyWorkflow, true);
  assert.equal(before.stages[2].state, 'blocked');
  const preserved = workshopContributionState({ validation: eligible, challenge, preservation: 'review-packet' });
  assert.equal(preserved.stages[1].state, 'complete');
  assert.equal(preserved.stages[2].state, 'available');
  assert.doesNotMatch(preserved.stages[2].label, /submitted|approved|verified/i);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { WORKSHOP_JOURNEY_STEPS, workshopJourneyState } from '../../src/ui/workshopJourney.js';

test('journey remains blocked until verified data is ready', () => {
  const journey = workshopJourneyState();
  assert.equal(WORKSHOP_JOURNEY_STEPS.length, 4);
  assert.deepEqual(journey.stages.map(stage => stage.state), ['current', 'blocked', 'blocked', 'blocked']);
  assert.match(journey.summary, /integrity-checked baseline/);
});

test('invalid geometry returns the researcher to adjustment without exposing handoff', () => {
  const journey = workshopJourneyState({ baselineReady: true, validation: { geometryValid: false, eligibleForContribution: false } });
  assert.equal(journey.stages[1].state, 'needs-attention');
  assert.equal(journey.stages[3].state, 'blocked');
  assert.match(journey.summary, /Fix the reported geometry/);
});

test('valid duplicates are preserved as experiments without improvement language', () => {
  const journey = workshopJourneyState({ baselineReady: true, validation: { geometryValid: true, eligibleForContribution: false } });
  assert.equal(journey.stages[2].detail, 'Valid; no improvement');
  assert.equal(journey.stages[3].state, 'current');
  assert.match(journey.summary, /does not improve the incumbent/);
});

test('eligible candidates require an exact challenge and remain bounded after preservation', () => {
  const ready = workshopJourneyState({ baselineReady: true, validation: { geometryValid: true, eligibleForContribution: true }, challengeReady: true });
  assert.match(ready.summary, /not proof or publication/);
  const preserved = workshopJourneyState({ baselineReady: true, validation: { geometryValid: true, eligibleForContribution: true }, challengeReady: true, preservation: 'review-packet' });
  assert.equal(preserved.stages[3].state, 'complete');
  assert.match(preserved.summary, /Independent verification and review are still required/);
});

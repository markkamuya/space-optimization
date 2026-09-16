import assert from 'node:assert/strict';
import test from 'node:test';
import atlas from '../../public/atlas-v2.json' with { type: 'json' };
import { workshopEntryState } from '../../src/ui/workshopEntry.js';

test('Compass handoff names the exact baseline without promoting its claim', () => {
  const baseline = atlas.records.find(record => record.id === 'iso-a110-r1p8');
  const state = workshopEntryState({ source: 'compass', linkedRecord: baseline.id, baseline, releaseVersion: atlas.version });
  assert.equal(state.visible, true);
  assert.equal(state.recordId, baseline.id);
  assert.equal(state.fill, baseline.verification.utilization);
  assert.equal(state.gap, baseline.bounds.optimalityGap);
  assert.match(state.summary, /unchanged starting point/i);
  assert.match(state.summary, /not a verified improvement, proof, or publication/i);
});

test('ordinary, stale, or unverified Workshop arrivals stay quiet', () => {
  const baseline = atlas.records[0];
  assert.deepEqual(workshopEntryState({ baseline, linkedRecord: baseline.id, releaseVersion: atlas.version }), { visible: false });
  assert.deepEqual(workshopEntryState({ source: 'compass', baseline, linkedRecord: 'other', releaseVersion: atlas.version }), { visible: false });
  assert.deepEqual(workshopEntryState({ source: 'compass', baseline, linkedRecord: baseline.id }), { visible: false });
});

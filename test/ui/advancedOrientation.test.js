import assert from 'node:assert/strict';
import test from 'node:test';
import { advancedOrientation } from '../../src/ui/advancedOrientation.js';

test('advanced orientation explains the current workflow and exact selected problem', () => {
  const view = advancedOrientation({
    hash: '#research?record=iso-a90-r0p75', angle: 90, ratio: 0.75, releaseReady: true,
    record: { id: 'iso-a90-r0p75', problem: { name: 'right 90° in 0.75:1 rectangle' }, evidence: { state: 'proven_optimal' } }
  });
  assert.equal(view.stage, 'Verify');
  assert.equal(view.problem, '90° triangle in a 0.75:1 rectangle');
  assert.equal(view.evidence, 'Proven optimal for this exact problem');
  assert.equal(view.recordId, 'iso-a90-r0p75');
});

test('advanced orientation fails closed while verified data is unavailable', () => {
  const view = advancedOrientation({ hash: '#compare', releaseReady: false });
  assert.equal(view.stage, 'Compare');
  assert.equal(view.evidence, 'Waiting for integrity-checked release');
  assert.equal(view.recordId, null);
});

test('unknown destinations return users to the explore explanation', () => {
  assert.equal(advancedOrientation({ hash: '#unknown' }).stage, 'Explore');
});

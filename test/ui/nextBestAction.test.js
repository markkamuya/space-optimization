import assert from 'node:assert/strict';
import test from 'node:test';
import { nextBestActions } from '../../src/ui/nextBestAction.js';

const records = [
  { id: 'open', family: 'isosceles', parameters: { apexAngle: 60, rectangleRatio: 1.5 }, evidence: { state: 'verified_best_known' }, bounds: { optimalityGap: .12 } },
  { id: 'near', family: 'isosceles', parameters: { apexAngle: 60, rectangleRatio: 1.65 }, evidence: { state: 'verified_best_known' }, bounds: { optimalityGap: .08 } },
  { id: 'proof', family: 'right', parameters: { apexAngle: 90, rectangleRatio: .75 }, evidence: { state: 'proven_optimal' }, bounds: { optimalityGap: 0 } }
];

test('open results recommend evidence, a proven control, and bounded improvement', () => {
  const actions = nextBestActions(records, records[0]);
  assert.deepEqual(actions.map(action => action.id), ['inspect', 'compare-proven', 'nearby']);
  assert.match(actions[0].description, /12\.0% room for improvement/);
  assert.equal(actions[1].right, 'proof');
});

test('proven results explain their bound without suggesting they need improvement', () => {
  const actions = nextBestActions(records, records[2]);
  assert.match(actions[0].description, /rigorous bound/);
  assert.equal(actions.some(action => action.id === 'improve'), false);
});

test('recommendations fail closed without verified records', () => {
  assert.deepEqual(nextBestActions([], null), []);
});

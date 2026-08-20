import assert from 'node:assert/strict';
import test from 'node:test';
import { evidenceLadder, evidenceLevel, recordConclusion } from '../../src/ui/evidenceStory.js';

test('evidence ladder preserves all four claim levels without proof inflation', () => {
  assert.equal(evidenceLevel('candidate'), 0);
  assert.equal(evidenceLevel('verified_construction'), 1);
  assert.equal(evidenceLevel('verified_best_known'), 2);
  assert.equal(evidenceLevel('proven_optimal'), 3);
  const bestKnown = evidenceLadder('verified_best_known');
  assert.deepEqual(bestKnown.map(step => step.reached), [true, true, true, false]);
  assert.equal(bestKnown.find(step => step.current).label, 'Best known');
});

test('best-known conclusion explicitly retains uncertainty', () => {
  const story = recordConclusion({
    evidence: { state: 'verified_best_known' },
    verification: { verifier: 'geometry-verifier/2.0.0', pieceCount: 12, certificate: 'sha256:test' },
    bounds: { optimalityGap: 0.125 }
  });
  assert.match(story.whatIsProven, /coordinates fit/);
  assert.match(story.whatIsUnknown, /12\.5% room for improvement/);
  assert.doesNotMatch(story.whatIsProven, /no better packing/);
});

test('proven conclusion remains scoped to the exact problem', () => {
  const story = recordConclusion({
    evidence: { state: 'proven_optimal' },
    verification: { verifier: 'geometry-verifier/2.0.0', pieceCount: 96, certificate: 'sha256:test' },
    bounds: { optimalityGap: 0 }
  });
  assert.match(story.whatIsProven, /no better packing exists for this exact/);
  assert.match(story.whatIsUnknown, /does not generalize/);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import atlas from '../../public/atlas-v2.json' with { type: 'json' };
import { compassEvidence, matchCompassQuestion, normalizeCompassQuestion } from '../../src/ui/packingCompass.js';

test('plain research choices map deterministically to verified Atlas records', () => {
  const question = { goal: 'find', triangle: 'equilateral', container: 'balanced' };
  const first = matchCompassQuestion(atlas.records, question);
  const second = matchCompassQuestion(atlas.records, question);
  assert.deepEqual(first, second);
  assert.equal(first.records.length, 1);
  assert.equal(first.records[0].family, 'equilateral');
  assert.ok(first.records[0].parameters.rectangleRatio >= 1);
  assert.ok(first.records[0].parameters.rectangleRatio < 1.5);
  assert.equal(first.records[0].parameters.rectangleRatio, 1.2);
});

test('verification prefers proof while improvement never presents a proven control as open', () => {
  const verification = matchCompassQuestion(atlas.records, { goal: 'verify', triangle: 'right', container: 'tall' });
  assert.equal(verification.records[0].evidence.state, 'proven_optimal');
  assert.equal(compassEvidence(verification.records[0]).label, 'Proven best');

  const improvement = matchCompassQuestion(atlas.records, { goal: 'improve', triangle: 'obtuse', container: 'wide' });
  assert.equal(improvement.records.length, 1);
  assert.notEqual(improvement.records[0].evidence.state, 'proven_optimal');
  assert.ok(improvement.records[0].bounds.optimalityGap > 0);
  assert.match(compassEvidence(improvement.records[0]).label, /not proven optimal/i);
});

test('comparison returns two verified records and malformed questions stay bounded', () => {
  const comparison = matchCompassQuestion(atlas.records, { goal: 'compare', triangle: 'acute', container: 'panoramic' });
  assert.equal(comparison.records.length, 2);
  assert.notEqual(comparison.records[0].id, comparison.records[1].id);
  assert.deepEqual(normalizeCompassQuestion({ goal: 'invented', triangle: '__proto__', container: 'none' }), {
    goal: 'find', triangle: 'equilateral', container: 'balanced'
  });
  assert.deepEqual(matchCompassQuestion([], comparison.question).records, []);
});

test('guided answer UI is fail-closed and progressively exposes technical evidence', async () => {
  const [script, styles] = await Promise.all([
    readFile(new URL('../../src/main.js', import.meta.url), 'utf8'),
    readFile(new URL('../../styles.css', import.meta.url), 'utf8')
  ]);
  assert.match(script, /Guided answers are withheld until integrity checks recover/);
  assert.match(script, /The Atlas will not substitute modeled or unverified data/);
  assert.match(script, /Inspect why we trust this answer/);
  assert.match(script, /Evidence statements apply only to each exact triangle and rectangle/);
  assert.match(script, /matchCompassQuestion\(canonicalRelease\?\.records/);
  assert.match(styles, /\.compass-answer-card nav a \{ display:flex; min-height:44px/);
});

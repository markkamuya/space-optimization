import assert from 'node:assert/strict';
import test from 'node:test';
import { formatResearchHash, parseResearchHash } from '../../src/ui/researchState.js';

test('research state round-trips through a deterministic shareable hash', () => {
  const state = { query: 'vertical 60°', family: 'equilateral', evidence: 'verified_best_known', record: 'record-17' };
  const hash = formatResearchHash(state);
  assert.equal(hash, '#research?q=vertical+60%C2%B0&family=equilateral&evidence=verified_best_known&record=record-17');
  assert.deepEqual(parseResearchHash(hash), state);
});

test('legacy record links and invalid filters remain backward compatible', () => {
  assert.deepEqual(parseResearchHash('#research?record=atlas-r1'), {
    query: '', family: 'all', evidence: 'all', record: 'atlas-r1'
  });
  assert.deepEqual(parseResearchHash('#research?family=unknown&evidence=forged'), {
    query: '', family: 'all', evidence: 'all', record: null
  });
});

test('default research state keeps the original hash', () => {
  assert.equal(formatResearchHash({ query: '', family: 'all', evidence: 'all' }), '#research');
});

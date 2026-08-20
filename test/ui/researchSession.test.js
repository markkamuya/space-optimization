import test from 'node:test';
import assert from 'node:assert/strict';
import { createResearchSession, restoreResearchSession, RESEARCH_SESSION_FORMAT } from '../../src/ui/researchSession.js';

const ids = ['a', 'b', 'c'];
const release = { version: '2.0.0', releasedAt: '2026-08-19T00:00:00.000Z' };
const integrity = { digest: 'a'.repeat(64) };
const state = {
  map: { angle: 75, ratio: 2.4, record: 'a', view: 'all' },
  research: { query: 'acute', family: 'equilateral', evidence: 'verified_best_known', record: 'b' },
  comparison: { left: 'a', right: 'c' },
  shortlist: ['c', 'a']
};

test('portable research session round-trips every workflow with release identity', async () => {
  const bundle = await createResearchSession(state, release, integrity, ids);
  assert.equal(bundle.format, RESEARCH_SESSION_FORMAT);
  assert.match(bundle.checksum, /^sha256:[0-9a-f]{64}$/);
  assert.deepEqual((await restoreResearchSession(JSON.stringify(bundle), release, integrity, ids)).session, state);
});

test('tampering and oversized imports fail closed', async () => {
  const bundle = await createResearchSession(state, release, integrity, ids);
  bundle.session.research.query = 'changed';
  assert.equal((await restoreResearchSession(bundle, release, integrity, ids)).valid, false);
  assert.equal((await restoreResearchSession(`{"padding":"${'x'.repeat(70_000)}"}`, release, integrity, ids)).status, 'oversized');
});

test('release changes and removed records restore only safe surviving context', async () => {
  const bundle = await createResearchSession(state, release, integrity, ids);
  const restored = await restoreResearchSession(bundle, { ...release, version: '2.1.0' }, { digest: 'b'.repeat(64) }, ['a']);
  assert.equal(restored.valid, true);
  assert.equal(restored.status, 'release_updated');
  assert.equal(restored.releaseChanged, true);
  assert.equal(restored.removed, 3);
  assert.deepEqual(restored.session.shortlist, ['a']);
  assert.equal(restored.session.comparison.right, null);
});

test('untrusted values are bounded without becoming scientific claims', async () => {
  const bundle = await createResearchSession({ map: { angle: 999, ratio: -2 }, research: { query: 'q'.repeat(500), family: 'forged', evidence: 'proven' }, comparison: {}, shortlist: [] }, release, integrity, ids);
  assert.equal(bundle.session.map.angle, 110);
  assert.equal(bundle.session.map.ratio, .75);
  assert.equal(bundle.session.research.query.length, 200);
  assert.equal(bundle.session.research.family, 'all');
  assert.equal(bundle.session.research.evidence, 'all');
});

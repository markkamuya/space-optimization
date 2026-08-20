import assert from 'node:assert/strict';
import test from 'node:test';
import release from '../../public/atlas-v2.json' with { type: 'json' };
import { contributionHandoff, createContributionStarter } from '../../src/ui/contributionStarter.js';
import { preflightContribution } from '../../src/ui/submissionPreflight.js';

const baseline = release.records.find(record => record.id === 'iso-a50-r1p95');
const integrity = { algorithm: 'SHA-256', artifact: 'atlas-v2-shards.json', digest: 'a'.repeat(64), scope: 'index and shards' };

test('starter preserves exact baseline problem and coordinates while marking duplicate status plainly', () => {
  const starter = createContributionStarter(baseline, release, integrity, 'verified_shards');
  assert.deepEqual(starter.problem, baseline.problem);
  assert.deepEqual(starter.solution.placements, baseline.solution.placements);
  assert.notEqual(starter.problem, baseline.problem);
  assert.match(starter.evidence.notes, /starter copied from verified baseline/i);
  assert.match(starter.evidence.notes, /improvement before submission/i);
  assert.equal(preflightContribution(starter, baseline).readyForFullVerification, true);
});

test('handoff supplies the exact CLI command and four bounded next steps', () => {
  const handoff = contributionHandoff(baseline);
  assert.equal(handoff.filename, 'iso-a50-r1p95-candidate.json');
  assert.equal(handoff.verifyCommand, 'npm run atlas:submission -- iso-a50-r1p95-candidate.json');
  assert.equal(handoff.steps.length, 4);
  assert.match(handoff.steps.join(' '), /maintainer review/i);
});

test('starter export fails closed without trusted release integrity', () => {
  assert.throws(() => createContributionStarter(baseline, release, null, 'verified_shards'), /verified_baseline_unavailable/);
});

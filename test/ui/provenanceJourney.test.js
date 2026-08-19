import assert from 'node:assert/strict';
import test from 'node:test';
import { buildProvenanceJourney } from '../../src/ui/provenanceJourney.js';

const record = {
  id: 'iso-a50-r1p95', experimentId: 'isosceles/apex-50/rectangle-1.95',
  provenance: { generator: 'portfolio/v2', seed: 'seed-1', contributor: 'Atlas' },
  verification: {
    verifier: 'geometry-verifier/2.0.0', certificate: 'sha256:certificate', fingerprint: 'tpa1-record',
    stability: { classification: 'contact' }
  },
  evidence: { state: 'verified_best_known' },
  bounds: { lowerBound: 0.9, upperBound: 0.98 }
};
const release = { version: '2.0.0', releasedAt: '2026-07-26T00:00:00.000Z' };
const integrity = { algorithm: 'SHA-256', artifact: 'atlas-v2-shards.json', digest: 'a'.repeat(64), scope: 'verified index and shards' };

test('builds a complete five-stage provenance journey in research order', () => {
  const stages = buildProvenanceJourney(record, release, integrity, 'verified_shards');
  assert.deepEqual(stages.map(stage => stage.id), ['identity', 'construction', 'verification', 'claim', 'release']);
  assert.match(stages[2].description, /sha256:certificate/);
  assert.match(stages[3].description, /global optimality is not claimed/i);
  assert.match(stages[4].value, new RegExp(`a{64}`));
  assert.match(stages[4].description, /atlas-v2-shards\.json/);
});

test('fails closed when release integrity is unavailable', () => {
  assert.deepEqual(buildProvenanceJourney(record, release, null, 'verified_shards'), []);
  assert.deepEqual(buildProvenanceJourney(record, release, { ...integrity, digest: '' }, 'verified_shards'), []);
});

test('labels a proven record without weakening the rigorous claim', () => {
  const stages = buildProvenanceJourney({ ...record, evidence: { state: 'proven_optimal' } }, release, integrity, 'verified_shards');
  assert.equal(stages[3].label, 'Proven optimal');
  assert.match(stages[3].description, /rigorous upper bound/);
});

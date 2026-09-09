import assert from 'node:assert/strict';
import test from 'node:test';
import atlas from '../../public/atlas-v2.json' with { type: 'json' };
import { findWorkshopBaselines, WORKSHOP_BASELINE_LIMIT } from '../../src/ui/workshopBaselineFinder.js';

test('baseline finder bounds the selector and keeps the current record first', () => {
  const currentId = atlas.records.at(-1).id;
  const result = findWorkshopBaselines(atlas.records, { currentId });
  assert.equal(result.records.length, WORKSHOP_BASELINE_LIMIT);
  assert.equal(result.records[0].id, currentId);
  assert.equal(result.truncated, true);
});

test('combined scientific terms match deterministically', () => {
  const result = findWorkshopBaselines(atlas.records, { query: 'isosceles 110 1.8' });
  assert.deepEqual(result.records.map(record => record.id), ['iso-a110-r1p8']);
});

test('an unmatched query retains only the current baseline without substituting data', () => {
  const result = findWorkshopBaselines(atlas.records, { query: 'not-a-scientific-record', currentId: 'iso-a110-r1p8' });
  assert.deepEqual(result.records.map(record => record.id), ['iso-a110-r1p8']);
  assert.equal(result.matchCount, 0);
  assert.equal(result.currentIncludedOutsideQuery, true);
});

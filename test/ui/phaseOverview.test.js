import assert from 'node:assert/strict';
import test from 'node:test';
import release from '../../public/atlas-v2.json' with { type: 'json' };
import { phaseMapDimensions, phaseMapRecords } from '../../src/ui/phaseOverview.js';

test('overview presents a bounded representative grid while full view preserves every map sample', () => {
  const overview = phaseMapRecords(release.records, 'overview');
  const full = phaseMapRecords(release.records, 'all');
  assert.equal(full.length, 256);
  assert.equal(overview.length, 48);
  assert.deepEqual(phaseMapDimensions(overview), { rows: 8, columns: 6 });
  assert.deepEqual(phaseMapDimensions(full), { rows: 16, columns: 16 });
  assert.ok(overview.length / full.length <= 0.2);
});

test('overview includes exact, dense, and open guided examples', () => {
  const ids = new Set(phaseMapRecords(release.records).map(record => record.id));
  for (const id of ['iso-a90-r1p5', 'iso-a75-r2p4', 'iso-a110-r3']) assert.ok(ids.has(id), id);
});

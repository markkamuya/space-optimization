import assert from 'node:assert/strict';
import test from 'node:test';
import { COMPARISON_WORKSPACE_LIMIT, restoreComparisonWorkspace, serializeComparisonWorkspace, updateComparisonWorkspace } from '../../src/ui/comparisonWorkspace.js';

const available = ['a', 'b', 'c', 'd', 'e', 'f', 'g'];

test('saved shortlist round-trips with release identity and stable order', () => {
  const raw = serializeComparisonWorkspace(['c', 'a', 'c'], available, '2.0.0');
  assert.deepEqual(restoreComparisonWorkspace(raw, available, '2.0.0'), { ids: ['c', 'a'], removed: 0, status: 'restored' });
});

test('release changes remove stale ids and report recovery', () => {
  const raw = serializeComparisonWorkspace(['a', 'b', 'c'], available, '1.0.0');
  const restored = restoreComparisonWorkspace(raw, ['a', 'c'], '2.0.0');
  assert.deepEqual(restored, { ids: ['a', 'c'], removed: 1, status: 'release_updated' });
});

test('invalid storage fails closed and a shortlist is bounded', () => {
  assert.deepEqual(restoreComparisonWorkspace('{broken', available, '2.0.0'), { ids: [], removed: 0, status: 'invalid' });
  const ids = available.reduce((current, id) => updateComparisonWorkspace(current, 'add', id), []);
  assert.equal(ids.length, COMPARISON_WORKSPACE_LIMIT);
  assert.deepEqual(ids, available.slice(0, COMPARISON_WORKSPACE_LIMIT));
});

test('records can be reordered and removed without duplication', () => {
  let ids = ['a', 'b', 'c'];
  ids = updateComparisonWorkspace(ids, 'up', 'c');
  assert.deepEqual(ids, ['a', 'c', 'b']);
  ids = updateComparisonWorkspace(ids, 'down', 'a');
  assert.deepEqual(ids, ['c', 'a', 'b']);
  ids = updateComparisonWorkspace(ids, 'remove', 'a');
  assert.deepEqual(ids, ['c', 'b']);
});

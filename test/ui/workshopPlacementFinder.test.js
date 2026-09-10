import assert from 'node:assert/strict';
import test from 'node:test';
import { findWorkshopPlacements, WORKSHOP_PLACEMENT_LIMIT, workshopPlacementLabel } from '../../src/ui/workshopPlacementFinder.js';

const placements = Array.from({ length: 208 }, (_, index) => ({ x: index / 10, y: index % 7, angle: index % 2 }));

test('placement navigation bounds dense selectors around the selected triangle', () => {
  const result = findWorkshopPlacements(placements, { currentIndex: 180 });
  assert.equal(result.total, 208);
  assert.equal(result.placements.length, WORKSHOP_PLACEMENT_LIMIT);
  assert.ok(result.placements.some(item => item.index === 180));
  assert.deepEqual(result.placements.map(item => item.index), [...result.placements.map(item => item.index)].sort((a, b) => a - b));
});

test('combined coordinate search retains selection without changing it', () => {
  const result = findWorkshopPlacements(placements, { query: 'x 4.2 y 0', currentIndex: 180 });
  assert.equal(result.matchCount, 1);
  assert.equal(result.placements[0].index, 180);
  assert.equal(result.placements[1].index, 42);
  assert.equal(result.currentIncludedOutsideQuery, true);
});

test('placement labels expose exact index and coordinates', () => {
  assert.equal(workshopPlacementLabel({ x: 1.234567, y: 3, angle: 0 }, 7), 'Triangle 8 · x 1.2346, y 3');
});

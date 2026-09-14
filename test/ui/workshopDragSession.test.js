import assert from 'node:assert/strict';
import test from 'node:test';
import { beginWorkshopDrag, finishWorkshopDrag, markWorkshopDragChanged } from '../../src/ui/workshopDragSession.js';

const candidate = { solution: { placements: [{ x: 1, y: 2, angle: 0 }] } };

test('completed changed drags become one committable transaction', () => {
  const session = markWorkshopDragChanged(beginWorkshopDrag(candidate, { pointerId: 4, placementIndex: 0, offsetX: 0.2, offsetY: 0.3 }));
  const moved = { solution: { placements: [{ x: 4, y: 5, angle: 0 }] } };
  const result = finishWorkshopDrag(session, moved);
  assert.equal(result.commit, true);
  assert.equal(result.candidate, moved);
  assert.equal(result.restored, false);
});

test('cancelled drags restore an isolated pre-drag snapshot without committing', () => {
  const session = markWorkshopDragChanged(beginWorkshopDrag(candidate, { pointerId: 4, placementIndex: 0, offsetX: 0, offsetY: 0 }));
  candidate.solution.placements[0].x = 99;
  const result = finishWorkshopDrag(session, candidate, { cancelled: true });
  assert.equal(result.commit, false);
  assert.equal(result.restored, true);
  assert.equal(result.candidate.solution.placements[0].x, 1);
});

test('selection-only gestures and duplicate finish attempts create no edit', () => {
  const session = beginWorkshopDrag(candidate, { pointerId: 4, placementIndex: 0, offsetX: 0, offsetY: 0 });
  assert.equal(finishWorkshopDrag(session, candidate).commit, false);
  assert.equal(finishWorkshopDrag(null, candidate).commit, false);
});

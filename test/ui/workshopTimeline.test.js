import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkshopTimeline, recordWorkshopState, redoWorkshopState, undoWorkshopState } from '../../src/ui/workshopTimeline.js';

function candidate(x) {
  return { id: 'draft', solution: { placements: [{ x, y: 0, angle: 0, reflect: false }] } };
}

test('workshop history supports bounded undo and redo without mutating snapshots', () => {
  let timeline = createWorkshopTimeline(candidate(0), 2);
  timeline = recordWorkshopState(timeline, candidate(1));
  timeline = recordWorkshopState(timeline, candidate(2));
  timeline = recordWorkshopState(timeline, candidate(3));
  assert.equal(timeline.past.length, 2);
  timeline.present.solution.placements[0].x = 30;
  timeline = undoWorkshopState(timeline);
  assert.equal(timeline.present.solution.placements[0].x, 2);
  timeline = undoWorkshopState(timeline);
  assert.equal(timeline.present.solution.placements[0].x, 1);
  timeline = redoWorkshopState(timeline);
  assert.equal(timeline.present.solution.placements[0].x, 2);
});

test('a new edit after undo clears redo state', () => {
  let timeline = recordWorkshopState(createWorkshopTimeline(candidate(0)), candidate(1));
  timeline = undoWorkshopState(timeline);
  assert.equal(timeline.future.length, 1);
  timeline = recordWorkshopState(timeline, candidate(4));
  assert.equal(timeline.future.length, 0);
  assert.equal(redoWorkshopState(timeline), timeline);
});

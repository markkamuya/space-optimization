import assert from 'node:assert/strict';
import test from 'node:test';
import { normalizeProblem } from '../../src/core/problem.js';
import { createWorkshopCandidate } from '../../src/ui/packingWorkshop.js';
import { workshopKeyboardPatch, workshopPlacementAtPoint, workshopProblemPoint, workshopViewport } from '../../src/ui/workshopInteraction.js';
import atlas from '../../public/atlas-v2.json' with { type: 'json' };

test('workshop canvas coordinates round-trip through the fitted container viewport', () => {
  const problem = normalizeProblem(atlas.records[0].problem);
  const viewport = workshopViewport(problem, 920, 560);
  const point = workshopProblemPoint(
    problem,
    920,
    560,
    viewport.originX + problem.width * viewport.scale * 0.4,
    viewport.originY + problem.height * viewport.scale * 0.6
  );
  assert.ok(Math.abs(point.x - problem.width * 0.4) < 1e-12);
  assert.ok(Math.abs(point.y - problem.height * 0.6) < 1e-12);
});

test('workshop hit testing selects the topmost visible triangle', () => {
  const baseline = atlas.records[0];
  const problem = normalizeProblem(baseline.problem);
  const candidate = createWorkshopCandidate(baseline);
  const first = candidate.solution.placements[0];
  assert.equal(workshopPlacementAtPoint(problem, candidate.solution.placements, { x: first.x, y: first.y }), 0);
  const duplicated = [first, { ...first }];
  assert.equal(workshopPlacementAtPoint(problem, duplicated, { x: first.x, y: first.y }), 1);
  assert.equal(workshopPlacementAtPoint(problem, candidate.solution.placements, { x: -100, y: -100 }), -1);
});

test('keyboard manipulation offers fine and coarse movement without hidden state', () => {
  const placement = { x: 1, y: 2, angle: 0, reflect: false };
  assert.deepEqual(workshopKeyboardPatch(placement, 'ArrowLeft'), { x: 0.99 });
  assert.deepEqual(workshopKeyboardPatch(placement, 'ArrowDown', { shiftKey: true }), { y: 2.1 });
  assert.deepEqual(workshopKeyboardPatch(placement, 'r'), { angle: 0.01 });
  assert.deepEqual(workshopKeyboardPatch(placement, 'R', { shiftKey: true }), { angle: 0.1 });
  assert.equal(workshopKeyboardPatch(placement, 'Enter'), null);
});

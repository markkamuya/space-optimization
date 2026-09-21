import assert from 'node:assert/strict';
import test from 'node:test';
import { requiresWorkshopResetConfirmation, workshopDestructivePrompt } from '../../src/ui/workshopEditSafety.js';

test('unchanged baselines avoid unnecessary reset confirmation', () => {
  assert.equal(requiresWorkshopResetConfirmation(false), false);
  assert.equal(requiresWorkshopResetConfirmation(true), true);
});

test('remove confirmation names the exact local triangle and undo path', () => {
  const prompt = workshopDestructivePrompt('remove', { placementIndex: 7, placementCount: 208 });
  assert.equal(prompt.title, 'Remove triangle 8?');
  assert.match(prompt.copy, /local 208-triangle candidate/);
  assert.match(prompt.copy, /Undo can restore/);
  assert.equal(prompt.confirmLabel, 'Remove triangle 8');
});

test('reset confirmation requires a checksummed recovery copy', () => {
  const prompt = workshopDestructivePrompt('reset');
  assert.match(prompt.copy, /checksummed browser recovery copy must be saved/);
  assert.equal(prompt.confirmLabel, 'Save recovery copy and reset');
  assert.equal(workshopDestructivePrompt('unknown'), null);
});

test('recovery confirmation explains replacement without implying publication', () => {
  const prompt = workshopDestructivePrompt('recover');
  assert.match(prompt.copy, /replace every current local coordinate/);
  assert.match(prompt.copy, /Nothing is uploaded or published/);
  assert.equal(prompt.confirmLabel, 'Recover saved work');
});

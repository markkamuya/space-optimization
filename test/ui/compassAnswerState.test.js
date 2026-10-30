import assert from 'node:assert/strict';
import test from 'node:test';
import { invalidateCompassAnswer } from '../../src/ui/compassAnswerState.js';

test('editing removes an old answer and its links without moving focus', () => {
  const answer = { hidden: false, children: ['old claim', 'old handoff'],
    replaceChildren() { this.children = []; },
    focus() { assert.fail('editing must not move focus'); } };
  const status = { textContent: '' };
  assert.equal(invalidateCompassAnswer(answer, status), true);
  assert.equal(answer.hidden, true);
  assert.deepEqual(answer.children, []);
  assert.match(status.textContent, /question changed.*Submit it again/);
  status.textContent = 'unchanged announcement';
  assert.equal(invalidateCompassAnswer(answer, status), false);
  assert.equal(status.textContent, 'unchanged announcement');
});

test('editing before the first submission remains quiet', () => {
  const status = { textContent: '' };
  assert.equal(invalidateCompassAnswer({ hidden: true }, status), false);
  assert.equal(status.textContent, '');
});

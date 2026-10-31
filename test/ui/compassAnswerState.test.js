import assert from 'node:assert/strict';
import test from 'node:test';
import { invalidateCompassAnswer, revealCompassAnswer, returnToCompassQuestion } from '../../src/ui/compassAnswerState.js';

test('submitted answers are revealed before instant scroll and focus, including empty results', () => {
  for (const contents of ['verified result', 'No verified answer is available.']) {
    const calls = [];
    const answer = { hidden: true, contents,
      scrollIntoView(options) { assert.equal(this.hidden, false); calls.push(['scroll', options]); },
      focus(options) { calls.push(['focus', options]); } };
    revealCompassAnswer(answer);
    assert.deepEqual(calls, [
      ['scroll', { block: 'start', behavior: 'instant' }],
      ['focus', { preventScroll: true }]
    ]);
    assert.equal(answer.contents, contents);
  }
});

test('edit action returns focus to the existing question without changing its value', () => {
  const calls = [];
  const control = { value: 'scalene', scrollIntoView: options => calls.push(options),
    focus: options => calls.push(options) };
  returnToCompassQuestion({ querySelector: selector => { assert.equal(selector, 'select'); return control; } });
  assert.equal(control.value, 'scalene');
  assert.deepEqual(calls, [{ block: 'center', behavior: 'instant' }, { preventScroll: true }]);
  assert.doesNotThrow(() => returnToCompassQuestion({ querySelector: () => null }));
});

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

import assert from 'node:assert/strict';
import test from 'node:test';
import { setLiveRegionHtml, setLiveRegionMode, setLiveRegionText } from '../../src/ui/liveRegion.js';

function element({ textContent = '', innerHTML = '' } = {}) {
  return { textContent, innerHTML, attributes: {}, setAttribute(name, value) { this.attributes[name] = value; } };
}

test('live text and markup update only when their exact content changes', () => {
  const text = element({ textContent: 'same' });
  assert.equal(setLiveRegionText(text, 'same'), false);
  assert.equal(setLiveRegionText(text, 'next'), true);
  assert.equal(text.textContent, 'next');
  const markup = element({ innerHTML: '<b>same</b>' });
  assert.equal(setLiveRegionHtml(markup, '<b>same</b>'), false);
  assert.equal(setLiveRegionHtml(markup, '<b>next</b>'), true);
});

test('live-region mode can be silenced and always restored explicitly', () => {
  const first = element();
  const second = element();
  setLiveRegionMode([first, null, second], false);
  assert.equal(first.attributes['aria-live'], 'off');
  assert.equal(second.attributes['aria-live'], 'off');
  setLiveRegionMode([first, second], true);
  assert.equal(first.attributes['aria-live'], 'polite');
  assert.equal(second.attributes['aria-live'], 'polite');
});

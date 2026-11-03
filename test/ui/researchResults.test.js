import assert from 'node:assert/strict';
import test from 'node:test';
import { renderResearchRows, revealResearchContinuation } from '../../src/ui/researchResults.js';

function fixture() {
  let buttons = [];
  let created = 0;
  const parse = html => html ? html.split('|').filter(Boolean).map(id => {
    created++;
    return { dataset: { record: id }, listeners: [], addEventListener(type, callback) {
      assert.equal(type, 'click'); this.listeners.push(callback);
    } };
  }) : [];
  return {
    querySelectorAll: () => buttons,
    set innerHTML(html) { buttons = parse(html); },
    insertAdjacentHTML(position, html) { assert.equal(position, 'beforeend'); buttons.push(...parse(html)); },
    get created() { return created; }
  };
}
const records = Array.from({ length: 53 }, (_, index) => ({ id: `record-${index}` }));
const options = { renderRow: record => `${record.id}|`, openRecord() {} };

test('all 304 canonical-sized results create 304 rows rather than rebuilding 2176', () => {
  const container = fixture();
  const data = Array.from({ length: 304 }, (_, index) => ({ id: `sample-${index}` }));
  let previousCost = 0;
  for (let limit = 24; limit < data.length + 24; limit += 24) {
    const visible = data.slice(0, limit);
    previousCost += visible.length;
    renderResearchRows(container, visible, { ...options, append: true });
  }
  assert.equal(previousCost, 2176);
  assert.equal(container.created, 304);
  assert.equal(container.querySelectorAll().length, 304);
});

test('continuation creates only new rows and preserves previous buttons and handlers', () => {
  const container = fixture();
  const opened = [];
  const settings = { ...options, openRecord: record => opened.push(record) };
  renderResearchRows(container, records.slice(0, 24), settings);
  const first = container.querySelectorAll()[0];
  const result = renderResearchRows(container, records.slice(0, 48), { ...settings, append: true });
  assert.equal(result.retained, 24);
  assert.equal(result.added, 24);
  assert.equal(container.created, 48);
  assert.equal(container.querySelectorAll()[0], first);
  assert.equal(first.listeners.length, 1);
  result.firstAdded.listeners[0]();
  assert.equal(opened[0], records[24]);
});

test('short final page and repeated continuation create no duplicate rows or listeners', () => {
  const container = fixture();
  renderResearchRows(container, records.slice(0, 48), options);
  const final = renderResearchRows(container, records, { ...options, append: true });
  assert.equal(final.added, 5);
  assert.equal(final.retained, 48);
  const repeated = renderResearchRows(container, records, { ...options, append: true });
  assert.equal(repeated.added, 0);
  assert.equal(repeated.firstAdded, null);
  assert.equal(container.created, 53);
});

test('changed order, filters, and release refresh replace rather than retain stale rows', () => {
  for (const next of [records.slice(24), records.slice(0, 3), [...records].reverse()]) {
    const container = fixture();
    renderResearchRows(container, records.slice(0, 24), options);
    assert.equal(renderResearchRows(container, next, { ...options, append: true }).retained, 0);
  }
  const container = fixture();
  renderResearchRows(container, records, options);
  const first = container.querySelectorAll()[0];
  renderResearchRows(container, records, options);
  assert.notEqual(container.querySelectorAll()[0], first);
  renderResearchRows(container, [], options);
  assert.equal(container.querySelectorAll().length, 0);
});

test('deliberate continuation announces its exact range and reveals before focusing', () => {
  const calls = [];
  const firstAdded = {
    scrollIntoView: options => calls.push(['scroll', options]),
    focus: options => calls.push(['focus', options])
  };
  const status = { textContent: '' };
  assert.equal(revealResearchContinuation({ retained: 48, added: 5, total: 53, firstAdded }, status), true);
  assert.equal(status.textContent, 'Added records 49–53. Showing 53 of 53 matching records.');
  assert.deepEqual(calls, [
    ['scroll', { block: 'center', behavior: 'instant' }],
    ['focus', { preventScroll: true }]
  ]);
});

test('empty, unavailable and exhausted continuations neither move focus nor repeat announcements', () => {
  const status = { textContent: 'Showing 0 of 0 matching records' };
  for (const result of [undefined, { added: 0 }, { firstAdded: null, added: 0 }]) {
    assert.equal(revealResearchContinuation(result, status), false);
    assert.equal(status.textContent, 'Showing 0 of 0 matching records');
  }
});

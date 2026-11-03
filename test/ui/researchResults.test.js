import assert from 'node:assert/strict';
import test from 'node:test';
import { renderResearchRows } from '../../src/ui/researchResults.js';

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

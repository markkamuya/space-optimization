import assert from 'node:assert/strict';
import test from 'node:test';
import { createWorkshopFrameCoalescer } from '../../src/ui/workshopFrameCoalescer.js';

test('dense pointer updates schedule at most one render per frame and keep the latest task', () => {
  const callbacks = [];
  const cancelled = [];
  const coalescer = createWorkshopFrameCoalescer(callback => (callbacks.push(callback), callbacks.length), id => cancelled.push(id));
  let rendered = 0;
  for (let index = 0; index < 10000; index += 1) coalescer.request(() => { rendered = index; });
  assert.equal(callbacks.length, 1);
  callbacks[0]();
  assert.equal(rendered, 9999);
  assert.equal(coalescer.pending(), false);
  assert.deepEqual(cancelled, []);
});

test('flush preserves the exact final task and cancel drops interrupted work', () => {
  const callbacks = [];
  const cancelled = [];
  const coalescer = createWorkshopFrameCoalescer(callback => (callbacks.push(callback), callbacks.length), id => cancelled.push(id));
  let rendered = 0;
  coalescer.request(() => { rendered = 42; });
  coalescer.flush();
  assert.equal(rendered, 42);
  assert.deepEqual(cancelled, [1]);
  coalescer.request(() => { rendered = 99; });
  coalescer.cancel();
  assert.equal(rendered, 42);
  assert.equal(coalescer.pending(), false);
});

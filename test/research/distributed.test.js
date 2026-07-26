import test from 'node:test';
import assert from 'node:assert/strict';
import { RESEARCH_RECORDS } from '../../src/research/dataset.js';
import { canonicalRecord } from '../../src/research/registry.js';
import { buildWorkQueue, validateWorkerResult } from '../../src/research/distributed.js';

test('distributed queue is prioritized and contains reproducibility contracts', () => {
  const queue = buildWorkQueue(RESEARCH_RECORDS.map(canonicalRecord));
  assert.ok(queue.length > 0);
  assert.equal(queue[0].status, 'open');
  assert.equal(queue[0].submissionContract.coordinatesRequired, true);
  assert.ok(queue[0].baselineUtilization <= queue[0].upperBound);
});

test('worker results must improve the assigned baseline', () => {
  const [task] = buildWorkQueue(RESEARCH_RECORDS.map(canonicalRecord));
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-1',
    placements: [],
    utilization: task.baselineUtilization
  });
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('does_not_improve_baseline'));
});

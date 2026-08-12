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
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-1',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: task.baselineUtilization
  }, record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('does_not_improve_baseline'));
});

test('worker results cannot forge utilization independently of coordinates', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-forged-score',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: 1
  }, record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('utilization_mismatch'));
  assert.ok(result.errors.includes('does_not_improve_baseline'));
  assert.equal(result.verification.valid, true);
});

test('worker results are verified against the assigned problem identity', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-wrong-container',
    problem: { ...record.problem, width: record.problem.width * 2 },
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('problem_identity_mismatch'));
});

test('worker results are bound to the queued experiment and exact baseline', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult({
    ...task,
    experimentId: `${task.experimentId}-tampered`,
    baselineFingerprint: 'tpa1-stale',
    baselineUtilization: task.baselineUtilization - 0.1
  }, {
    recordId: task.recordId,
    seed: 'worker-stale-task',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('task_experiment_mismatch'));
  assert.ok(result.errors.includes('stale_baseline_fingerprint'));
  assert.ok(result.errors.includes('stale_baseline_utilization'));
});

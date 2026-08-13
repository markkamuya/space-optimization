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

test('worker validation accepts zero as a deterministic seed', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 0,
    solverVersion: 'atlas-worker/1.0.0',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.equal(result.errors.includes('missing_seed'), false);
  assert.equal(result.errors.includes('missing_solver_version'), false);
});

test('worker validation requires a solver version for reproducibility', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    recordId: task.recordId,
    seed: 'worker-without-version',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.ok(result.errors.includes('missing_solver_version'));
});

test('worker validation reports malformed envelopes without throwing', () => {
  const result = validateWorkerResult(null, null, null);
  assert.equal(result.valid, false);
  assert.ok(result.errors.includes('invalid_task'));
  assert.ok(result.errors.includes('invalid_candidate'));
});

test('worker results are bound to the exact task and experiment identifiers', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const result = validateWorkerResult(task, {
    taskId: `${task.taskId}-wrong`,
    recordId: task.recordId,
    experimentId: `${task.experimentId}-wrong`,
    seed: 'worker-replayed-envelope',
    solverVersion: 'atlas-worker/1.0.0',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization
  }, record);
  assert.ok(result.errors.includes('task_id_mismatch'));
  assert.ok(result.errors.includes('experiment_id_mismatch'));
});

test('worker results must report valid usage within the assigned budget', () => {
  const records = RESEARCH_RECORDS.map(canonicalRecord);
  const [task] = buildWorkQueue(records);
  const record = records.find(candidate => candidate.id === task.recordId);
  const candidate = {
    taskId: task.taskId,
    recordId: task.recordId,
    experimentId: task.experimentId,
    seed: 'worker-over-budget',
    solverVersion: 'atlas-worker/1.0.0',
    problem: record.problem,
    placements: record.solution.placements,
    utilization: record.verification.utilization,
    budgetUsed: {
      orientationEvaluations: task.budget.orientationEvaluations + 1,
      wallTimeSeconds: task.budget.wallTimeSeconds + 0.1
    }
  };
  const result = validateWorkerResult(task, candidate, record);
  assert.ok(result.errors.includes('orientation_budget_exceeded'));
  assert.ok(result.errors.includes('wall_time_budget_exceeded'));

  candidate.budgetUsed = { orientationEvaluations: -1, wallTimeSeconds: Number.NaN };
  const malformed = validateWorkerResult(task, candidate, record);
  assert.ok(malformed.errors.includes('invalid_budget_usage'));
});

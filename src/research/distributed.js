export function buildWorkQueue(records) {
  return records
    .filter(record => record.bounds.optimalityGap > 0)
    .sort((a, b) => b.bounds.optimalityGap - a.bounds.optimalityGap)
    .map((record, index) => ({
      taskId: `v2-${String(index + 1).padStart(4, '0')}`,
      recordId: record.id,
      experimentId: record.experimentId,
      priority: record.bounds.optimalityGap >= 0.1 ? 'high' : record.bounds.optimalityGap >= 0.04 ? 'medium' : 'low',
      objective: 'Improve the verified lower bound or attach a stronger rigorous upper bound.',
      baselineFingerprint: record.verification.fingerprint,
      baselineUtilization: record.verification.utilization,
      upperBound: record.bounds.upperBound,
      budget: { orientationEvaluations: 5000, wallTimeSeconds: 900 },
      submissionContract: {
        deterministicSeedRequired: true,
        coordinatesRequired: true,
        independentVerificationRequired: true
      },
      status: 'open'
    }));
}

export function workQueueDigest(tasks) {
  return createHash('sha256').update(JSON.stringify(tasks)).digest('hex');
}

const leaseDigest = value => createHash('sha256').update(JSON.stringify(value)).digest('hex');

function sealLeaseLedger(statement) {
  return { ...statement, sha256: leaseDigest(statement) };
}

function appendLeaseEvent(ledger, event) {
  const previousSha256 = ledger.events.at(-1)?.sha256 ?? null;
  const statement = { ...event, previousSha256 };
  const next = structuredClone(ledger);
  delete next.sha256;
  next.events.push({ ...statement, sha256: leaseDigest(statement) });
  return sealLeaseLedger(next);
}

export function migrateLeaseLedger(tasks, ledger, occurredAt = 0) {
  if (ledger?.format === 'tpa-worker-lease-ledger/v2') return structuredClone(ledger);
  if (ledger?.format !== 'tpa-worker-lease-ledger/v1' || ledger.queueDigest !== workQueueDigest(tasks)) {
    throw new Error('lease_ledger_migration_invalid');
  }
  const migrated = sealLeaseLedger({ format: 'tpa-worker-lease-ledger/v2',
    queueDigest: ledger.queueDigest, leases: structuredClone(ledger.leases ?? {}),
    attempts: structuredClone(ledger.attempts ?? {}), events: [] });
  return appendLeaseEvent(migrated, { type: 'v1_migration', occurredAt,
    leases: structuredClone(ledger.leases ?? {}), attempts: structuredClone(ledger.attempts ?? {}) });
}

export function replayLeaseLedger(ledger) {
  const errors = [];
  if (ledger?.format !== 'tpa-worker-lease-ledger/v2' || typeof ledger.queueDigest !== 'string' ||
    !Array.isArray(ledger.events)) return { valid: false, errors: ['lease_ledger_shape_invalid'] };
  const leases = {};
  const attempts = {};
  let previous = null;
  let lastTime = -Infinity;
  for (const event of ledger.events) {
    const { sha256, ...statement } = event;
    if (event.previousSha256 !== previous || leaseDigest(statement) !== sha256) errors.push('lease_event_chain_invalid');
    if (!Number.isFinite(event.occurredAt) || event.occurredAt < lastTime) errors.push('lease_event_time_regression');
    lastTime = event.occurredAt;
    if (event.type === 'v1_migration') {
      Object.assign(leases, structuredClone(event.leases ?? {}));
      Object.assign(attempts, structuredClone(event.attempts ?? {}));
    } else if (event.type === 'lease_claimed') {
      if (leases[event.lease.taskId]) errors.push(`lease_double_assignment:${event.lease.taskId}`);
      leases[event.lease.taskId] = structuredClone(event.lease);
      attempts[event.lease.taskId] = event.lease.attempt;
    } else if (event.type === 'lease_checkpointed') {
      if (leases[event.taskId]?.token !== event.token) errors.push(`checkpoint_lease_mismatch:${event.taskId}`);
      else leases[event.taskId] = { ...leases[event.taskId], expiresAt: event.expiresAt,
        checkpoint: structuredClone(event.checkpoint) };
    } else if (event.type === 'lease_expired') {
      if (leases[event.taskId]?.token !== event.token) errors.push(`expiration_lease_mismatch:${event.taskId}`);
      else delete leases[event.taskId];
    } else errors.push(`lease_event_type_invalid:${event.type}`);
    previous = sha256;
  }
  const { sha256, ...ledgerStatement } = ledger;
  if (leaseDigest(ledgerStatement) !== sha256) errors.push('lease_ledger_digest_invalid');
  if (JSON.stringify(leases) !== JSON.stringify(ledger.leases) ||
    JSON.stringify(attempts) !== JSON.stringify(ledger.attempts)) errors.push('lease_materialized_state_drift');
  return { valid: errors.length === 0, errors, leases, attempts, events: ledger.events.length };
}

export function recoverLeaseLedger(ledger) {
  const replay = replayLeaseLedger(ledger);
  const structuralErrors = replay.errors?.filter(error =>
    !['lease_ledger_digest_invalid', 'lease_materialized_state_drift'].includes(error)) ?? [];
  if (structuralErrors.length) return { valid: false, errors: structuralErrors, ledger };
  const recovered = { format: 'tpa-worker-lease-ledger/v2', queueDigest: ledger.queueDigest,
    leases: replay.leases, attempts: replay.attempts, events: structuredClone(ledger.events) };
  return { valid: true, errors: [], ledger: sealLeaseLedger(recovered), recoveredEvents: replay.events };
}

export function createLeaseLedger(tasks) {
  return sealLeaseLedger({
    format: 'tpa-worker-lease-ledger/v2',
    queueDigest: workQueueDigest(tasks),
    leases: {},
    attempts: {},
    events: []
  });
}

function validWorker(worker) {
  return worker && typeof worker.workerId === 'string' && /^[a-z0-9][a-z0-9._-]{1,127}$/.test(worker.workerId) &&
    Number.isInteger(worker.maxOrientationEvaluations) && worker.maxOrientationEvaluations > 0 &&
    Number.isFinite(worker.maxWallTimeSeconds) && worker.maxWallTimeSeconds > 0;
}

export function expireWorkerLeases(ledger, now) {
  let next = structuredClone(ledger);
  for (const [taskId, lease] of Object.entries(ledger.leases ?? {})) {
    if (lease.expiresAt <= now) {
      next = appendLeaseEvent(next, { type: 'lease_expired', occurredAt: now, taskId, token: lease.token });
      delete next.sha256;
      delete next.leases[taskId];
      next = sealLeaseLedger(next);
    }
  }
  return next;
}

export function claimWorkerTask(tasks, ledger, worker, now, leaseSeconds = 900) {
  if (!Array.isArray(tasks) || ledger?.queueDigest !== workQueueDigest(tasks)) {
    return { valid: false, errors: ['queue_digest_mismatch'], ledger, lease: null };
  }
  if (!validWorker(worker) || !Number.isFinite(now) || !Number.isFinite(leaseSeconds) || leaseSeconds <= 0) {
    return { valid: false, errors: ['invalid_claim'], ledger, lease: null };
  }
  const replay = replayLeaseLedger(ledger);
  if (!replay.valid) return { valid: false, errors: replay.errors, ledger, lease: null };
  let next = expireWorkerLeases(ledger, now);
  if (typeof worker.requestId === 'string') {
    const existing = Object.values(next.leases).find(lease => lease.requestId === worker.requestId &&
      lease.workerId === worker.workerId);
    if (existing) return { valid: true, errors: [], ledger: next, lease: existing, idempotent: true };
  }
  const task = tasks.find(candidate => candidate.status === 'open' && !next.leases[candidate.taskId] &&
    candidate.budget.orientationEvaluations <= worker.maxOrientationEvaluations &&
    candidate.budget.wallTimeSeconds <= worker.maxWallTimeSeconds);
  if (!task) return { valid: true, errors: [], ledger: next, lease: null };
  const attempt = (next.attempts[task.taskId] ?? 0) + 1;
  next.attempts[task.taskId] = attempt;
  const lease = {
    taskId: task.taskId,
    recordId: task.recordId,
    experimentId: task.experimentId,
    workerId: worker.workerId,
    requestId: typeof worker.requestId === 'string' ? worker.requestId : null,
    attempt,
    issuedAt: now,
    expiresAt: now + leaseSeconds,
    baselineFingerprint: task.baselineFingerprint,
    token: createHash('sha256').update([
      next.queueDigest, task.taskId, worker.workerId, attempt, now, now + leaseSeconds
    ].join(':')).digest('hex')
  };
  next = appendLeaseEvent(next, { type: 'lease_claimed', occurredAt: now, lease });
  delete next.sha256;
  next.leases[task.taskId] = lease;
  next.attempts[task.taskId] = attempt;
  next = sealLeaseLedger(next);
  return { valid: true, errors: [], ledger: next, lease };
}

export function checkpointWorkerLease(ledger, checkpoint, now, extendSeconds = 900) {
  const replay = replayLeaseLedger(ledger);
  if (!replay.valid) return { valid: false, errors: replay.errors, ledger };
  const lease = ledger?.leases?.[checkpoint?.taskId];
  const errors = [];
  if (!lease || lease.token !== checkpoint?.token || lease.workerId !== checkpoint?.workerId) {
    errors.push('lease_identity_mismatch');
  } else if (lease.expiresAt <= now) errors.push('lease_expired');
  if (!Number.isInteger(checkpoint?.orientationEvaluations) || checkpoint.orientationEvaluations < 0 ||
    !Number.isFinite(checkpoint?.bestUtilization) || checkpoint.bestUtilization < 0 || checkpoint.bestUtilization > 1) {
    errors.push('invalid_checkpoint');
  }
  if (errors.length) return { valid: false, errors, ledger };
  if (lease.checkpoint?.requestId && lease.checkpoint.requestId === checkpoint.requestId) {
    return { valid: true, errors: [], ledger, idempotent: true };
  }
  const next = structuredClone(ledger);
  next.leases[checkpoint.taskId] = {
    ...lease,
    expiresAt: now + extendSeconds,
    checkpoint: {
      orientationEvaluations: checkpoint.orientationEvaluations,
      bestUtilization: checkpoint.bestUtilization,
      requestId: typeof checkpoint.requestId === 'string' ? checkpoint.requestId : null,
      updatedAt: now
    }
  };
  const updated = appendLeaseEvent(ledger, { type: 'lease_checkpointed', occurredAt: now,
    taskId: checkpoint.taskId, token: lease.token, expiresAt: now + extendSeconds,
    checkpoint: next.leases[checkpoint.taskId].checkpoint });
  delete updated.sha256;
  updated.leases[checkpoint.taskId] = next.leases[checkpoint.taskId];
  return { valid: true, errors: [], ledger: sealLeaseLedger(updated) };
}

export function validateWorkerResult(task, candidate, assignedRecord) {
  const errors = [];
  const queuedTask = task && typeof task === 'object' && !Array.isArray(task) ? task : {};
  const submitted = candidate && typeof candidate === 'object' && !Array.isArray(candidate) ? candidate : {};
  if (queuedTask !== task) errors.push('invalid_task');
  if (submitted !== candidate) errors.push('invalid_candidate');
  if (submitted.taskId !== queuedTask.taskId) errors.push('task_id_mismatch');
  if (submitted.recordId !== queuedTask.recordId) errors.push('record_id_mismatch');
  if (submitted.experimentId !== queuedTask.experimentId) errors.push('experiment_id_mismatch');
  if (queuedTask.experimentId !== assignedRecord?.experimentId) errors.push('task_experiment_mismatch');
  if (queuedTask.baselineFingerprint !== assignedRecord?.verification?.fingerprint) {
    errors.push('stale_baseline_fingerprint');
  }
  if (!Number.isFinite(queuedTask.baselineUtilization) ||
    Math.abs(queuedTask.baselineUtilization - (assignedRecord?.verification?.utilization ?? NaN)) > 1e-10) {
    errors.push('stale_baseline_utilization');
  }
  const validSeed = (typeof submitted.seed === 'string' && submitted.seed.trim().length > 0 && submitted.seed.length <= 256) ||
    (typeof submitted.seed === 'number' && Number.isFinite(submitted.seed));
  if (!validSeed) errors.push('invalid_seed');
  if (typeof submitted.solverVersion !== 'string' || submitted.solverVersion.trim().length === 0 ||
    submitted.solverVersion.length > 256 || /[\u0000-\u001f\u007f]/.test(submitted.solverVersion)) {
    errors.push('missing_solver_version');
  }
  if (!submitted.budgetUsed || typeof submitted.budgetUsed !== 'object' ||
    !Number.isInteger(submitted.budgetUsed.orientationEvaluations) ||
    submitted.budgetUsed.orientationEvaluations < 0 ||
    !Number.isFinite(submitted.budgetUsed.wallTimeSeconds) ||
    submitted.budgetUsed.wallTimeSeconds < 0) {
    errors.push('invalid_budget_usage');
  } else {
    if (submitted.budgetUsed.orientationEvaluations > (queuedTask.budget?.orientationEvaluations ?? -1)) {
      errors.push('orientation_budget_exceeded');
    }
    if (submitted.budgetUsed.wallTimeSeconds > (queuedTask.budget?.wallTimeSeconds ?? -1)) {
      errors.push('wall_time_budget_exceeded');
    }
  }
  if (!submitted.problem || typeof submitted.problem !== 'object') errors.push('missing_problem');
  if (!Array.isArray(submitted.placements)) errors.push('missing_coordinates');
  if (!Number.isFinite(submitted.utilization)) errors.push('missing_utilization');
  if (!assignedRecord || assignedRecord.id !== queuedTask.recordId) errors.push('assigned_record_mismatch');

  let verification = null;
  if (assignedRecord && submitted.problem && Array.isArray(submitted.placements)) {
    try {
      if (packingProblemIdentity(submitted.problem) !== packingProblemIdentity(assignedRecord.problem)) {
        errors.push('problem_identity_mismatch');
      }
    } catch {
      errors.push('invalid_problem_identity');
    }
    try {
      verification = verifyPacking(submitted.problem, submitted.placements);
      if (!verification.valid) errors.push('invalid_geometry');
      if (verification.metrics && Number.isFinite(submitted.utilization) &&
        Math.abs(verification.metrics.utilization - submitted.utilization) > 1e-10) {
        errors.push('utilization_mismatch');
      }
      if (verification.metrics && verification.metrics.utilization <= queuedTask.baselineUtilization + 1e-10) {
        errors.push('does_not_improve_baseline');
      }
    } catch {
      errors.push('invalid_geometry');
    }
  }
  return { valid: errors.length === 0, errors, verification };
}

export function rankVerifiedWorkerResults(results) {
  const ordered = [...results].sort((left, right) =>
    left.taskId.localeCompare(right.taskId) ||
    right.utilization - left.utilization ||
    left.fingerprint.localeCompare(right.fingerprint) ||
    left.workerId.localeCompare(right.workerId));
  const winners = [];
  const seenTasks = new Set();
  const seenFingerprints = new Set();
  for (const result of ordered) {
    if (seenTasks.has(result.taskId) || seenFingerprints.has(result.fingerprint)) continue;
    winners.push(result);
    seenTasks.add(result.taskId);
    seenFingerprints.add(result.fingerprint);
  }
  return winners;
}

export function ingestWorkerResults(tasks, ledger, candidates, records, now) {
  const taskById = new Map(tasks.map(task => [task.taskId, task]));
  const recordById = new Map(records.map(record => [record.id, record]));
  const accepted = [];
  const rejected = [];
  for (const candidate of candidates) {
    const task = taskById.get(candidate?.taskId);
    const lease = ledger?.leases?.[candidate?.taskId];
    const leaseErrors = [];
    if (!task) leaseErrors.push('unknown_task');
    if (!lease || lease.token !== candidate?.leaseToken || lease.workerId !== candidate?.workerId) {
      leaseErrors.push('lease_identity_mismatch');
    } else if (lease.expiresAt <= now) leaseErrors.push('lease_expired');
    const validation = task
      ? validateWorkerResult(task, candidate, recordById.get(task.recordId))
      : { valid: false, errors: [], verification: null };
    const errors = [...leaseErrors, ...validation.errors];
    if (errors.length) {
      rejected.push({ taskId: candidate?.taskId ?? null, workerId: candidate?.workerId ?? null, errors });
    } else {
      accepted.push({
        taskId: task.taskId,
        recordId: task.recordId,
        experimentId: task.experimentId,
        workerId: candidate.workerId,
        leaseToken: candidate.leaseToken,
        seed: candidate.seed,
        solverVersion: candidate.solverVersion,
        utilization: validation.verification.metrics.utilization,
        improvement: validation.verification.metrics.utilization - task.baselineUtilization,
        fingerprint: validation.verification.fingerprint,
        problem: candidate.problem,
        placements: candidate.placements,
        budgetUsed: candidate.budgetUsed
      });
    }
  }
  const winners = rankVerifiedWorkerResults(accepted);
  const statement = {
    format: 'tpa-worker-ingestion/v1',
    queueDigest: workQueueDigest(tasks),
    accepted,
    rejected,
    winners
  };
  return {
    ...statement,
    sha256: createHash('sha256').update(JSON.stringify(statement)).digest('hex')
  };
}

export function verifyWorkerIngestionEvidence(evidence) {
  if (evidence?.format !== 'tpa-worker-ingestion/v1' || !Array.isArray(evidence.accepted) ||
    !Array.isArray(evidence.rejected) || !Array.isArray(evidence.winners)) return false;
  const { sha256, ...statement } = evidence;
  return sha256 === createHash('sha256').update(JSON.stringify(statement)).digest('hex') &&
    JSON.stringify(rankVerifiedWorkerResults(evidence.accepted)) === JSON.stringify(evidence.winners);
}
import { packingProblemIdentity } from '../atlas/submission.js';
import { verifyPacking } from '../atlas/verifier.js';
import { createHash } from 'node:crypto';

import { assessSubmission } from '../atlas/submission.js';
import { packingProblemIdentity } from '../atlas/problemIdentity.js';
import { preflightContribution } from './submissionPreflight.js';

export const PACKING_WORKSHOP_FORMAT = 'triangle-packing-workshop/v1';
export const PACKING_WORKSHOP_MAX_BYTES = 5 * 1024 * 1024;

function clone(value) {
  return structuredClone(value);
}

function candidateEvidence(baselineId) {
  return {
    status: 'candidate',
    notes: `Browser workshop draft based on ${baselineId}. Local checks do not publish, prove, or independently verify this candidate.`
  };
}

function normalizedCandidate(candidate, baselineId) {
  return {
    ...clone(candidate),
    evidence: candidateEvidence(baselineId)
  };
}

function payloadForChecksum(bundle) {
  const { checksum: _checksum, ...payload } = bundle;
  return JSON.stringify(payload);
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await globalThis.crypto.subtle.digest('SHA-256', bytes);
  return `sha256:${[...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('')}`;
}

function sameProblem(candidate, baseline) {
  try {
    return packingProblemIdentity(candidate.problem) === packingProblemIdentity(baseline.problem);
  } catch {
    return false;
  }
}

function homogeneousTriangle(problem) {
  const triangles = problem?.triangles;
  if (!Array.isArray(triangles) || triangles.length === 0) return null;
  const signature = JSON.stringify(triangles[0].sides);
  return triangles.every(triangle => JSON.stringify(triangle.sides) === signature)
    ? triangles[0]
    : null;
}

export function parseWorkshopHash(hash = '') {
  if (!hash.startsWith('#workshop')) return { record: null };
  const query = hash.includes('?') ? hash.slice(hash.indexOf('?') + 1) : '';
  const record = new URLSearchParams(query).get('record');
  return { record: typeof record === 'string' && /^[a-z0-9._-]{1,160}$/i.test(record) ? record : null };
}

export function formatWorkshopHash(record) {
  return record ? `#workshop?record=${encodeURIComponent(record)}` : '#workshop';
}

export function createWorkshopCandidate(baseline, { createdAt = new Date().toISOString() } = {}) {
  if (!baseline?.id || !baseline?.problem || !Array.isArray(baseline?.solution?.placements)) {
    throw new TypeError('A verified baseline with coordinates is required.');
  }
  return {
    format: 'triangle-packing-atlas/v1',
    id: `${baseline.id}-candidate`,
    problem: clone(baseline.problem),
    solution: {
      construction: `workshop-${baseline.id}`,
      placements: clone(baseline.solution.placements)
    },
    evidence: candidateEvidence(baseline.id),
    provenance: {
      generator: 'packing-workshop',
      version: '1.0.0',
      seed: baseline.reproducibility?.seed ?? baseline.provenance?.seed ?? `workshop-${baseline.id}`,
      runtimeMs: 0,
      contributor: 'replace-with-your-name',
      license: 'CC-BY-4.0',
      createdAt
    }
  };
}

export function updateWorkshopPlacement(candidate, index, patch) {
  if (!Number.isInteger(index) || index < 0 || index >= candidate?.solution?.placements?.length) {
    throw new RangeError('Placement index is outside this candidate.');
  }
  const next = normalizedCandidate(candidate, candidate.id.replace(/-candidate$/, ''));
  const current = next.solution.placements[index];
  const placement = {
    ...current,
    ...patch,
    x: patch.x ?? current.x,
    y: patch.y ?? current.y,
    angle: patch.angle ?? current.angle ?? 0,
    reflect: patch.reflect ?? current.reflect ?? false
  };
  if (![placement.x, placement.y, placement.angle].every(Number.isFinite) || typeof placement.reflect !== 'boolean') {
    throw new TypeError('Placement coordinates, angle, and reflection must use finite supported values.');
  }
  next.solution.placements[index] = placement;
  return next;
}

export function addWorkshopPiece(candidate) {
  const next = normalizedCandidate(candidate, candidate.id.replace(/-candidate$/, ''));
  const triangle = homogeneousTriangle(next.problem);
  if (!triangle) throw new TypeError('Adding pieces is available only for homogeneous triangle inventories.');
  const limit = Number.isInteger(next.problem.maxPieces) ? next.problem.maxPieces : 1000;
  if (next.solution.placements.length >= limit) throw new RangeError(`This problem allows at most ${limit} pieces.`);
  const index = next.problem.triangles.length;
  next.problem.triangles.push({ ...clone(triangle), id: `${next.id}-piece-${index + 1}` });
  next.solution.placements.push({ x: next.problem.margin, y: next.problem.margin, angle: 0, reflect: false });
  return next;
}

export function removeWorkshopPiece(candidate, index) {
  if (!Number.isInteger(index) || index < 0 || index >= candidate?.solution?.placements?.length) {
    throw new RangeError('Placement index is outside this candidate.');
  }
  if (candidate.solution.placements.length <= 1) throw new RangeError('A candidate must retain at least one triangle.');
  const next = normalizedCandidate(candidate, candidate.id.replace(/-candidate$/, ''));
  next.problem.triangles.splice(index, 1);
  next.solution.placements.splice(index, 1);
  return next;
}

export function updateWorkshopProvenance(candidate, patch) {
  const next = normalizedCandidate(candidate, candidate.id.replace(/-candidate$/, ''));
  next.provenance = { ...next.provenance, ...patch, license: 'CC-BY-4.0' };
  return next;
}

export function validateWorkshopCandidate(candidate, baseline, publishedRecords) {
  const safeCandidate = normalizedCandidate(candidate, baseline.id);
  const preflight = preflightContribution(safeCandidate, baseline);
  const assessment = assessSubmission(safeCandidate, publishedRecords);
  const candidateUtilization = assessment.verification.metrics?.utilization ?? null;
  const baselineUtilization = baseline.verification.utilization;
  const delta = candidateUtilization == null ? null : candidateUtilization - baselineUtilization;
  const geometryValid = assessment.verification.valid;
  const improvesIncumbent = assessment.disposition === 'improves_record';
  const eligibleForContribution = preflight.readyForFullVerification && geometryValid && improvesIncumbent;
  const headline = !preflight.readyForFullVerification
    ? 'Draft metadata or structure needs work'
    : !geometryValid
      ? 'Local geometry check failed'
      : assessment.disposition === 'reject_duplicate'
        ? 'Locally valid, but identical to a published packing'
        : assessment.disposition === 'reject_inferior'
          ? 'Locally valid, but not better than the incumbent'
          : improvesIncumbent
            ? 'Locally verified improvement candidate'
            : 'Locally valid candidate for a new problem';
  return {
    candidate: safeCandidate,
    preflight,
    assessment,
    comparison: {
      baselineId: baseline.id,
      baselineUtilization,
      candidateUtilization,
      delta
    },
    geometryValid,
    improvesIncumbent,
    eligibleForContribution,
    headline,
    boundary: improvesIncumbent
      ? 'Local geometry and incumbent comparison support an improvement candidate. This is not a proof, publication, or maintainer approval.'
      : 'No improvement claim is supported. The draft remains a candidate and the published incumbent is unchanged.'
  };
}

export async function createWorkshopBundle({ candidate, baseline, validation, release, integrity, source, exportedAt = new Date().toISOString() }) {
  if (!candidate || !baseline?.id || !release?.version || !integrity?.digest || !source) {
    throw new TypeError('Verified release identity and a workshop candidate are required.');
  }
  const safeCandidate = normalizedCandidate(candidate, baseline.id);
  const bundle = {
    format: PACKING_WORKSHOP_FORMAT,
    exportedAt,
    release: { version: release.version, releasedAt: release.releasedAt, source, digest: integrity.digest },
    baseline: { id: baseline.id, fingerprint: baseline.verification.fingerprint, utilization: baseline.verification.utilization },
    candidate: safeCandidate,
    localValidation: validation ? {
      disposition: validation.assessment.disposition,
      geometryValid: validation.geometryValid,
      improvement: validation.comparison.delta,
      eligibleForContribution: validation.eligibleForContribution,
      boundary: validation.boundary
    } : null,
    handoff: {
      verifyCommand: `npm run atlas:submission -- ${safeCandidate.id}.json`,
      repository: 'https://github.com/markkamuya/space-optimization',
      reviewRequired: true
    }
  };
  return { ...bundle, checksum: await sha256(payloadForChecksum(bundle)) };
}

export async function restoreWorkshopBundle(raw, baseline, release, integrity, source) {
  const issues = [];
  if (typeof raw === 'string' && raw.length > PACKING_WORKSHOP_MAX_BYTES) {
    return { valid: false, issues: ['The workshop file is larger than 5 MB.'] };
  }
  let bundle;
  try { bundle = typeof raw === 'string' ? JSON.parse(raw) : clone(raw); } catch { return { valid: false, issues: ['The workshop file is not valid JSON.'] }; }
  if (bundle?.format !== PACKING_WORKSHOP_FORMAT) issues.push('The workshop format is missing or unsupported.');
  if (!/^sha256:[0-9a-f]{64}$/.test(bundle?.checksum ?? '')) issues.push('The workshop checksum is missing or malformed.');
  else if (bundle.checksum !== await sha256(payloadForChecksum(bundle))) issues.push('The workshop checksum does not match its contents.');
  if (bundle?.release?.version !== release?.version || bundle?.release?.releasedAt !== release?.releasedAt ||
      bundle?.release?.source !== source || bundle?.release?.digest !== integrity?.digest) {
    issues.push('The saved draft belongs to a different verified release.');
  }
  if (bundle?.baseline?.id !== baseline?.id || bundle?.baseline?.fingerprint !== baseline?.verification?.fingerprint) {
    issues.push('The saved baseline does not match this verified packing.');
  }
  if (bundle?.candidate?.evidence?.status !== 'candidate') issues.push('Workshop files may contain candidate evidence only.');
  if (!sameProblem(bundle?.candidate, baseline)) issues.push('The candidate problem does not match the selected baseline.');
  return { valid: issues.length === 0, issues, candidate: issues.length ? null : normalizedCandidate(bundle.candidate, baseline.id), bundle };
}

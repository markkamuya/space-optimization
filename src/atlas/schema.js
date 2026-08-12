import { ATLAS_FORMAT, EVIDENCE_STATES } from './constants.js';

const ALLOWED_RECORD_FIELDS = new Set(['format', 'id', 'problem', 'solution', 'evidence', 'provenance']);
const ALLOWED_PROBLEM_FIELDS = new Set([
  'name', 'width', 'height', 'margin', 'kerf', 'allowRotation', 'allowReflection',
  'fillSheet', 'maxPieces', 'seed', 'triangles'
]);
const ALLOWED_TRIANGLE_FIELDS = new Set(['id', 'sides', 'color']);
const ALLOWED_SOLUTION_FIELDS = new Set(['construction', 'placements']);
const ALLOWED_PLACEMENT_FIELDS = new Set(['x', 'y', 'angle', 'reflect']);
const ALLOWED_PROVENANCE_FIELDS = new Set([
  'generator', 'version', 'seed', 'runtimeMs', 'contributor', 'createdAt'
]);

function rejectUnknownFields(value, allowed, path, add) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return;
  for (const key of Object.keys(value)) {
    if (!allowed.has(key)) add(path ? `${path}.${key}` : key, 'Unknown field');
  }
}

export function validateRecordShape(record) {
  const errors = [];
  const add = (path, message) => errors.push({ path, message });
  if (!record || typeof record !== 'object' || Array.isArray(record)) add('', 'Record must be an object');
  rejectUnknownFields(record, ALLOWED_RECORD_FIELDS, '', add);
  if (record?.format !== ATLAS_FORMAT) add('format', `Must equal ${ATLAS_FORMAT}`);
  if (!/^[a-z0-9][a-z0-9-]+$/.test(record?.id ?? '')) add('id', 'Use a stable lowercase kebab-case id');
  if (!record?.problem || typeof record.problem !== 'object') add('problem', 'Problem is required');
  if (!record?.solution || typeof record.solution !== 'object') add('solution', 'Solution is required');
  if (!Array.isArray(record?.solution?.placements)) add('solution.placements', 'Placements must be an array');
  if (typeof record?.solution?.construction !== 'string') add('solution.construction', 'Construction is required');
  if (!EVIDENCE_STATES.includes(record?.evidence?.status)) add('evidence.status', 'Unknown evidence state');
  if (!record?.provenance?.generator) add('provenance.generator', 'Generator is required');
  if (!record?.provenance?.createdAt || Number.isNaN(Date.parse(record.provenance.createdAt))) {
    add('provenance.createdAt', 'A valid ISO date-time is required');
  }
  rejectUnknownFields(record?.problem, ALLOWED_PROBLEM_FIELDS, 'problem', add);
  rejectUnknownFields(record?.solution, ALLOWED_SOLUTION_FIELDS, 'solution', add);
  rejectUnknownFields(record?.provenance, ALLOWED_PROVENANCE_FIELDS, 'provenance', add);
  for (const [index, triangle] of (record?.problem?.triangles ?? []).entries()) {
    rejectUnknownFields(triangle, ALLOWED_TRIANGLE_FIELDS, `problem.triangles.${index}`, add);
  }
  for (const [index, placement] of (record?.solution?.placements ?? []).entries()) {
    rejectUnknownFields(placement, ALLOWED_PLACEMENT_FIELDS, `solution.placements.${index}`, add);
    for (const key of ['x', 'y', 'angle']) {
      if (!Number.isFinite(placement?.[key])) add(`solution.placements.${index}.${key}`, 'Must be finite');
    }
    if (placement?.reflect !== undefined && typeof placement.reflect !== 'boolean') {
      add(`solution.placements.${index}.reflect`, 'Must be a boolean when provided');
    }
  }
  return { valid: errors.length === 0, errors };
}

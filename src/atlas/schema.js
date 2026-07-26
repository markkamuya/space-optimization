import { ATLAS_FORMAT, EVIDENCE_STATES } from './constants.js';

export function validateRecordShape(record) {
  const errors = [];
  const add = (path, message) => errors.push({ path, message });
  if (!record || typeof record !== 'object' || Array.isArray(record)) add('', 'Record must be an object');
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
  for (const [index, placement] of (record?.solution?.placements ?? []).entries()) {
    for (const key of ['x', 'y', 'angle']) {
      if (!Number.isFinite(placement?.[key])) add(`solution.placements.${index}.${key}`, 'Must be finite');
    }
  }
  return { valid: errors.length === 0, errors };
}

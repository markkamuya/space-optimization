import { readFile } from 'node:fs/promises';
import { ATLAS_RECORDS } from './catalog.js';
import { verifyPacking } from './verifier.js';
import { CANONICAL_FORMAT, validateCanonicalRecords } from '../research/registry.js';

export function validatePublishedRelease(release) {
  if (release?.format !== CANONICAL_FORMAT || !Array.isArray(release?.records)) {
    throw new Error(`Expected a ${CANONICAL_FORMAT} release with a records array`);
  }
  let registry;
  try {
    registry = validateCanonicalRecords(release.records);
  } catch {
    throw new Error('Canonical release contains malformed record metadata');
  }
  if (!registry.valid) throw new Error('Canonical release failed registry validation');
  for (const record of release.records) {
    const replay = verifyPacking(record.problem, record.solution?.placements);
    if (!replay.valid || replay.fingerprint !== record.verification?.fingerprint ||
      Math.abs(replay.metrics.utilization - record.verification?.utilization) > 1e-10) {
      throw new Error(`Canonical release record failed independent replay: ${record.id ?? 'unknown'}`);
    }
  }
  return release.records;
}

export async function loadPublishedRecords(
  source = new URL('../../public/atlas-v2.json', import.meta.url)
) {
  const release = JSON.parse(await readFile(source, 'utf8'));
  return [...ATLAS_RECORDS, ...validatePublishedRelease(release)];
}

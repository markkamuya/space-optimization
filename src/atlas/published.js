import { readFile } from 'node:fs/promises';
import { ATLAS_RECORDS } from './catalog.js';
import { CANONICAL_FORMAT } from '../research/registry.js';

export async function loadPublishedRecords(
  source = new URL('../../public/atlas-v2.json', import.meta.url)
) {
  const release = JSON.parse(await readFile(source, 'utf8'));
  if (release.format !== CANONICAL_FORMAT || !Array.isArray(release.records)) {
    throw new Error(`Expected a ${CANONICAL_FORMAT} release with a records array`);
  }
  if (release.records.some(record => !record.verification?.valid)) {
    throw new Error('Canonical release contains an unverified published record');
  }
  return [...ATLAS_RECORDS, ...release.records];
}

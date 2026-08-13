import { readFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { ATLAS_RECORDS } from './catalog.js';
import { verifyPacking } from './verifier.js';
import { CANONICAL_FORMAT, validateCanonicalRecords } from '../research/registry.js';
import { packingProblemIdentity } from './problemIdentity.js';

const trustedIndexes = new WeakMap();

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

function createVerifiedIncumbentIndex(records) {
  const byFingerprint = new Map();
  const byProblem = new Map();
  for (const record of records) {
    byFingerprint.set(record.verification.fingerprint, record);
    const identity = packingProblemIdentity(record.problem);
    const comparable = byProblem.get(identity) ?? [];
    comparable.push(record);
    byProblem.set(identity, comparable);
  }
  for (const comparable of byProblem.values()) {
    comparable.sort((left, right) => right.verification.utilization - left.verification.utilization);
    Object.freeze(comparable);
  }
  const index = Object.freeze({ kind: 'verified-incumbent-index' });
  const sourceDigest = createHash('sha256').update(JSON.stringify(records.map(record => ({
    id: record.id,
    problem: record.problem,
    placements: record.solution.placements,
    verification: record.verification
  })))).digest('hex');
  trustedIndexes.set(index, { byFingerprint, byProblem, sourceDigest, size: records.length, records });
  return index;
}

export function snapshotVerifiedIncumbentIndex(index) {
  const trusted = trustedIndexes.get(index);
  if (!trusted) throw new Error('Cannot snapshot an unverified incumbent index');
  return trusted.records.map(record => ({
    id: record.id,
    problem: record.problem,
    solution: { placements: record.solution.placements },
    verification: record.verification
  }));
}

export function buildVerifiedIncumbentIndex(records) {
  if (!Array.isArray(records)) throw new Error('Verified incumbent records must be an array');
  for (const record of records) {
    const replay = verifyPacking(record?.problem, record?.solution?.placements);
    if (!replay.valid || replay.fingerprint !== record?.verification?.fingerprint ||
      Math.abs(replay.metrics.utilization - record?.verification?.utilization) > 1e-10) {
      throw new Error(`Cannot index unverified incumbent: ${record?.id ?? 'unknown'}`);
    }
  }
  return createVerifiedIncumbentIndex(records);
}

export function queryVerifiedIncumbentIndex(index, fingerprint, identity) {
  const trusted = trustedIndexes.get(index);
  if (!trusted) return null;
  return {
    duplicate: trusted.byFingerprint.get(fingerprint),
    comparable: identity === null ? [] : (trusted.byProblem.get(identity) ?? []),
    sourceDigest: trusted.sourceDigest,
    size: trusted.size
  };
}

export async function loadPublishedRecords(
  source = new URL('../../public/atlas-v2.json', import.meta.url)
) {
  const release = JSON.parse(await readFile(source, 'utf8'));
  return [...ATLAS_RECORDS, ...validatePublishedRelease(release)];
}

export async function loadPublishedIncumbentIndex(
  source = new URL('../../public/atlas-v2.json', import.meta.url),
  checksumSource = new URL('../../public/atlas-v2.sha256', import.meta.url)
) {
  const [payload, checksumFile] = await Promise.all([
    readFile(source, 'utf8'),
    readFile(checksumSource, 'utf8')
  ]);
  const actual = createHash('sha256').update(payload).digest('hex');
  const declared = checksumFile.trim().split(/\s+/)[0];
  if (actual !== declared) throw new Error('Published dataset checksum mismatch');
  const release = JSON.parse(payload);
  return createVerifiedIncumbentIndex([
    ...ATLAS_RECORDS,
    ...validatePublishedRelease(release)
  ]);
}

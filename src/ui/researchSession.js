export const RESEARCH_SESSION_FORMAT = 'triangle-packing-atlas-research-session/v1';
const MAX_BYTES = 64 * 1024;
const MAX_QUERY = 200;
const MAX_SHORTLIST = 6;
const FAMILIES = new Set(['all', 'right', 'equilateral', 'isosceles', 'scalene']);
const EVIDENCE = new Set(['all', 'proven_optimal', 'verified_best_known']);

function safeId(value, available) {
  const id = typeof value === 'string' && value.length <= 160 ? value : null;
  return id && available.has(id) ? id : null;
}

function normalize(session, availableIds) {
  const available = availableIds instanceof Set ? availableIds : new Set(availableIds);
  const mapRecord = safeId(session?.map?.record, available);
  const researchRecord = safeId(session?.research?.record, available);
  const comparisonLeft = safeId(session?.comparison?.left, available);
  const comparisonRight = safeId(session?.comparison?.right, available);
  const shortlist = [...new Set(Array.isArray(session?.shortlist) ? session.shortlist : [])]
    .map(id => safeId(id, available)).filter(Boolean).slice(0, MAX_SHORTLIST);
  return {
    map: {
      angle: Math.min(110, Math.max(35, Number.isFinite(Number(session?.map?.angle)) ? Math.round(Number(session.map.angle)) : 60)),
      ratio: Math.min(3, Math.max(.75, Number.isFinite(Number(session?.map?.ratio)) ? Number(Number(session.map.ratio).toFixed(2)) : 1.5)),
      record: mapRecord,
      view: session?.map?.view === 'all' ? 'all' : 'overview'
    },
    research: {
      query: String(session?.research?.query ?? '').slice(0, MAX_QUERY),
      family: FAMILIES.has(session?.research?.family) ? session.research.family : 'all',
      evidence: EVIDENCE.has(session?.research?.evidence) ? session.research.evidence : 'all',
      record: researchRecord
    },
    comparison: { left: comparisonLeft, right: comparisonRight },
    shortlist
  };
}

async function sha256(value) {
  const bytes = new TextEncoder().encode(value);
  const digest = await crypto.subtle.digest('SHA-256', bytes);
  return [...new Uint8Array(digest)].map(byte => byte.toString(16).padStart(2, '0')).join('');
}

function payloadString(bundle) {
  return JSON.stringify({ format: bundle.format, release: bundle.release, session: bundle.session });
}

export async function createResearchSession(session, release, integrity, availableIds) {
  if (!release?.version || !release?.releasedAt || !integrity?.digest) throw new Error('verified_release_required');
  const bundle = {
    format: RESEARCH_SESSION_FORMAT,
    release: { version: release.version, releasedAt: release.releasedAt, digest: integrity.digest },
    session: normalize(session, availableIds)
  };
  return { ...bundle, checksum: `sha256:${await sha256(payloadString(bundle))}` };
}

export async function restoreResearchSession(raw, trustedRelease, trustedIntegrity, availableIds) {
  const issues = [];
  const encoded = typeof raw === 'string' ? raw : JSON.stringify(raw);
  if (new TextEncoder().encode(encoded).byteLength > MAX_BYTES) return { valid: false, status: 'oversized', issues: ['The session file is larger than 64 KB.'] };
  let bundle;
  try { bundle = typeof raw === 'string' ? JSON.parse(raw) : raw; } catch { return { valid: false, status: 'invalid', issues: ['The session file is not valid JSON.'] }; }
  if (bundle?.format !== RESEARCH_SESSION_FORMAT) issues.push('The session format is missing or unsupported.');
  if (!/^sha256:[0-9a-f]{64}$/.test(bundle?.checksum ?? '')) issues.push('The session checksum is missing or malformed.');
  else if (bundle.checksum !== `sha256:${await sha256(payloadString(bundle))}`) issues.push('The session checksum does not match its contents.');
  if (issues.length) return { valid: false, status: 'invalid', issues };
  const session = normalize(bundle.session, availableIds);
  const originalIds = [bundle.session?.map?.record, bundle.session?.research?.record, bundle.session?.comparison?.left, bundle.session?.comparison?.right, ...(bundle.session?.shortlist ?? [])].filter(Boolean);
  const restoredIds = [session.map.record, session.research.record, session.comparison.left, session.comparison.right, ...session.shortlist].filter(Boolean);
  const removed = originalIds.length - restoredIds.length;
  const releaseChanged = bundle.release?.version !== trustedRelease?.version
    || bundle.release?.releasedAt !== trustedRelease?.releasedAt
    || bundle.release?.digest !== trustedIntegrity?.digest;
  return { valid: true, status: releaseChanged ? 'release_updated' : removed ? 'partial' : 'restored', releaseChanged, removed, session, sourceRelease: bundle.release, issues: [] };
}

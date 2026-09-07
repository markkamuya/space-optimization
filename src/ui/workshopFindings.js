import { normalizeProblem } from '../core/problem.js';
import { boundaryOverflow, overlapArea, polygonDistance, transform } from '../geometry/triangle.js';
import { VERIFICATION_TOLERANCE } from '../atlas/constants.js';

const GEOMETRY_CODES = new Set(['OUT_OF_BOUNDS', 'OVERLAP', 'SPACING_VIOLATION']);

function diagnosticFindings(candidate, codes, limit) {
  if (!candidate?.problem || !Array.isArray(candidate?.solution?.placements)) return [];
  let problem;
  try { problem = normalizeProblem(candidate.problem); } catch { return []; }
  if (problem.triangles.length !== candidate.solution.placements.length) return [];
  const placed = candidate.solution.placements.map((placement, index) => ({ index, shape: transform(problem.triangles[index].shape, placement) }));
  const container = { minX: problem.margin, minY: problem.margin, maxX: problem.width - problem.margin, maxY: problem.height - problem.margin };
  const findings = [];
  if (codes.has('OUT_OF_BOUNDS')) for (const item of placed) {
    const amount = boundaryOverflow(item.shape, container);
    if (amount > VERIFICATION_TOLERANCE.boundaryEpsilon) findings.push({ code: 'OUT_OF_BOUNDS', placementIndex: item.index, label: `Triangle ${item.index + 1} crosses the container boundary`, detail: `Measured boundary overflow: ${amount}.` });
    if (findings.length >= limit) return findings;
  }
  for (let left = 0; left < placed.length; left += 1) for (let right = left + 1; right < placed.length; right += 1) {
    if (codes.has('OVERLAP')) {
      const amount = overlapArea(placed[left].shape, placed[right].shape);
      if (amount > VERIFICATION_TOLERANCE.overlapAreaEpsilon) findings.push({ code: 'OVERLAP', placementIndex: left, relatedPlacementIndex: right, label: `Triangles ${left + 1} and ${right + 1} overlap`, detail: `Measured positive overlap area: ${amount}.` });
    }
    if (findings.length >= limit) return findings;
    if (codes.has('SPACING_VIOLATION') && problem.kerf > 0) {
      const shortfall = Math.max(0, problem.kerf - polygonDistance(placed[left].shape, placed[right].shape));
      if (shortfall > VERIFICATION_TOLERANCE.spacingEpsilon) findings.push({ code: 'SPACING_VIOLATION', placementIndex: left, relatedPlacementIndex: right, label: `Triangles ${left + 1} and ${right + 1} are too close`, detail: `Measured spacing shortfall: ${shortfall}.` });
    }
    if (findings.length >= limit) return findings;
  }
  return findings;
}

function samePlacement(left, right) {
  return left && right && left.x === right.x && left.y === right.y &&
    (left.angle ?? 0) === (right.angle ?? 0) && (left.reflect ?? false) === (right.reflect ?? false);
}

export function buildWorkshopFindings(validation, candidate, baseline = null, limit = 30) {
  const failures = validation?.preflight?.checks?.filter(item => !item.passed) ?? [];
  const errors = validation?.assessment?.verification?.errors ?? [];
  const codes = new Set(errors.map(error => error.code));
  const findings = failures.map(item => ({ code: 'PREFLIGHT', placementIndex: null, label: item.label, detail: item.detail }));
  const diagnosticLimit = Math.max(0, limit - findings.length);
  const diagnostics = diagnosticFindings(candidate, codes, diagnosticLimit + 1);
  findings.push(...diagnostics.slice(0, diagnosticLimit));
  const diagnosedCodes = new Set(diagnostics.map(item => item.code));
  for (const error of errors) {
    if (GEOMETRY_CODES.has(error.code) && diagnosedCodes.has(error.code)) continue;
    const match = /^solution\.placements\.(\d+)(?:\.|$)/.exec(error.path ?? '');
    findings.push({ code: error.code, placementIndex: match ? Number(match[1]) : null, label: error.code.replaceAll('_', ' ').toLowerCase(), detail: error.message });
    if (findings.length >= limit) break;
  }
  const candidatePlacements = candidate?.solution?.placements ?? [];
  const baselinePlacements = baseline?.solution?.placements ?? [];
  const recoverable = findings.slice(0, limit).map(item => {
    let placementIndex = item.placementIndex;
    if (item.relatedPlacementIndex != null && samePlacement(candidatePlacements[placementIndex], baselinePlacements[placementIndex]) &&
      !samePlacement(candidatePlacements[item.relatedPlacementIndex], baselinePlacements[item.relatedPlacementIndex])) {
      placementIndex = item.relatedPlacementIndex;
    }
    return {
      ...item,
      placementIndex,
      canRestore: placementIndex != null && baselinePlacements.length === candidatePlacements.length &&
        !samePlacement(candidatePlacements[placementIndex], baselinePlacements[placementIndex])
    };
  });
  return { findings: recoverable, truncated: diagnostics.length > diagnosticLimit };
}

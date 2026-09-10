export const WORKSHOP_PLACEMENT_LIMIT = 40;

function finiteLabel(value) {
  return Number.isFinite(value) ? Number(value.toFixed(4)).toString() : 'invalid';
}

export function workshopPlacementLabel(placement, index) {
  return `Triangle ${index + 1} · x ${finiteLabel(placement?.x)}, y ${finiteLabel(placement?.y)}`;
}

export function findWorkshopPlacements(placements, { query = '', currentIndex = 0, limit = WORKSHOP_PLACEMENT_LIMIT } = {}) {
  const safePlacements = Array.isArray(placements) ? placements : [];
  const safeLimit = Math.max(1, Math.min(WORKSHOP_PLACEMENT_LIMIT, Math.trunc(limit) || WORKSHOP_PLACEMENT_LIMIT));
  const selectedIndex = Math.max(0, Math.min(Math.trunc(currentIndex) || 0, Math.max(0, safePlacements.length - 1)));
  const terms = String(query).trim().toLowerCase().split(/\s+/).filter(Boolean);
  let matches;
  if (terms.length) {
    matches = safePlacements.map((placement, index) => ({ placement, index })).filter(({ placement, index }) => {
      const searchable = `${index + 1} triangle ${index + 1} x ${finiteLabel(placement?.x)} y ${finiteLabel(placement?.y)} angle ${finiteLabel(placement?.angle ?? 0)}`.toLowerCase().split(/\s+/);
      return terms.every(term => searchable.includes(term));
    });
  } else {
    const start = Math.max(0, Math.min(selectedIndex - Math.floor(safeLimit / 2), Math.max(0, safePlacements.length - safeLimit)));
    matches = safePlacements.slice(start, start + safeLimit).map((placement, offset) => ({ placement, index: start + offset }));
  }
  const currentIncludedOutsideQuery = terms.length > 0 && !matches.some(item => item.index === selectedIndex) && safePlacements[selectedIndex] !== undefined;
  const visible = currentIncludedOutsideQuery
    ? [{ placement: safePlacements[selectedIndex], index: selectedIndex }, ...matches.filter(item => item.index !== selectedIndex)].slice(0, safeLimit)
    : matches.slice(0, safeLimit);
  return {
    placements: visible,
    matchCount: terms.length ? matches.length : safePlacements.length,
    currentIncludedOutsideQuery,
    truncated: matches.length > safeLimit,
    total: safePlacements.length
  };
}

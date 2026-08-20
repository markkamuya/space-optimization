function nearest(records, anchor, predicate) {
  return records.filter(predicate).sort((a, b) => {
    const distanceA = Math.abs((a.parameters?.apexAngle ?? 0) - (anchor.parameters?.apexAngle ?? 0)) / 100
      + Math.abs((a.parameters?.rectangleRatio ?? 0) - (anchor.parameters?.rectangleRatio ?? 0));
    const distanceB = Math.abs((b.parameters?.apexAngle ?? 0) - (anchor.parameters?.apexAngle ?? 0)) / 100
      + Math.abs((b.parameters?.rectangleRatio ?? 0) - (anchor.parameters?.rectangleRatio ?? 0));
    return distanceA - distanceB || a.id.localeCompare(b.id);
  })[0] ?? null;
}

export function nextBestActions(records, anchor) {
  if (!Array.isArray(records) || !anchor) return [];
  const proven = nearest(records, anchor, record => record.id !== anchor.id && record.evidence?.state === 'proven_optimal');
  const sameShape = nearest(records, anchor, record => record.id !== anchor.id && record.family === anchor.family);
  const open = anchor.evidence?.state !== 'proven_optimal' && Number(anchor.bounds?.optimalityGap) > 0;
  return [
    {
      id: 'inspect', label: 'Understand the evidence',
      description: open ? `Inspect why ${Number(anchor.bounds.optimalityGap * 100).toFixed(1)}% room for improvement remains.` : 'Inspect the rigorous bound that makes this exact result optimal.',
      kind: 'research', recordId: anchor.id
    },
    proven && anchor.evidence?.state !== 'proven_optimal' && {
      id: 'compare-proven', label: 'Compare with a proven control',
      description: 'See how best-known and proven-optimal evidence differ without treating the problems as equivalent.',
      kind: 'compare', left: anchor.id, right: proven.id
    },
    sameShape && {
      id: 'nearby', label: 'Change one condition',
      description: 'Keep the triangle family and inspect a nearby verified container or angle.',
      kind: 'compare', left: anchor.id, right: sameShape.id
    },
    open && {
      id: 'improve', label: 'Try to improve this result',
      description: 'Start from its verified coordinates and preserve the published claim while testing a candidate.',
      kind: 'challenge', recordId: anchor.id
    }
  ].filter(Boolean).slice(0, 3);
}

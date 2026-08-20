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

const FAMILY_WORDS = Object.freeze(['equilateral', 'isosceles', 'scalene', 'right']);

export function parseResearchCommand(input) {
  const raw = String(input ?? '').trim().slice(0, 160);
  const text = raw.toLowerCase();
  if (!text) return { valid: false, message: 'Describe a triangle, container, evidence question, or comparison.' };
  const family = FAMILY_WORDS.find(word => text.includes(word)) ?? 'all';
  const angleMatch = text.match(/\b(35|[4-9]\d|10\d|110)\s*°?/);
  const angle = angleMatch ? Number(angleMatch[1]) : null;
  const explicitRatio = text.match(/\b(0\.75|0\.9|1(?:\.\d+)?|2(?:\.\d+)?|3(?:\.0+)?)\s*(?::\s*1)?\b/);
  const ratio = text.includes('very wide') || text.includes('panoramic') ? 2.4
    : text.includes('wide') ? 1.8
      : text.includes('tall') ? 0.75
        : text.includes('square') ? 1.05
          : explicitRatio ? Math.min(3, Math.max(.75, Number(explicitRatio[1]))) : null;
  const evidence = /\b(open|unproven|improve)\b/.test(text) ? 'verified_best_known'
    : /\b(proven|proof|optimal)\b/.test(text) ? 'proven_optimal' : 'all';
  const comparison = /\b(compare|versus|difference)\b/.test(text);
  const recognized = family !== 'all' || angle !== null || ratio !== null || evidence !== 'all' || comparison;
  if (!recognized) return { valid: false, message: 'Try “show open 60° cases near a square” or “compare proven right triangles”.' };
  return {
    valid: true, family, angle, ratio, evidence, comparison,
    message: `Interpreted as ${evidence === 'all' ? 'verified' : evidence.replaceAll('_', ' ')} ${family === 'all' ? 'triangle' : family} results${angle == null ? '' : ` near ${angle}°`}${ratio == null ? '' : ` in a ${ratio.toFixed(2)}:1 rectangle`}.`
  };
}

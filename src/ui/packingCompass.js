const TRIANGLE_PROFILES = Object.freeze({
  right: record => record.family === 'right',
  equilateral: record => record.family === 'equilateral',
  acute: record => record.family === 'isosceles' && record.parameters.apexAngle < 90,
  right_isosceles: record => record.family === 'isosceles' && record.parameters.apexAngle === 90,
  obtuse: record => record.family === 'isosceles' && record.parameters.apexAngle > 90,
  scalene: record => record.family === 'scalene'
});

const CONTAINER_PROFILES = Object.freeze({
  tall: ratio => ratio < 1,
  balanced: ratio => ratio >= 1 && ratio < 1.5,
  wide: ratio => ratio >= 1.5 && ratio <= 2.1,
  panoramic: ratio => ratio > 2.1
});

const TRIANGLE_ANCHORS = Object.freeze({ acute: 60, right_isosceles: 90, obtuse: 110 });
const CONTAINER_ANCHORS = Object.freeze({ tall: 0.75, balanced: 1.2, wide: 1.8, panoramic: 2.4 });

export const COMPASS_TRIANGLE_OPTIONS = Object.freeze([
  ['right', 'Right triangle'],
  ['equilateral', 'Equilateral triangle'],
  ['acute', 'Acute isosceles triangle (around 60°)'],
  ['right_isosceles', 'Right isosceles triangle'],
  ['obtuse', 'Obtuse isosceles triangle (around 110°)'],
  ['scalene', 'Scalene triangle']
]);

export const COMPASS_CONTAINER_OPTIONS = Object.freeze([
  ['tall', 'Tall rectangle (around 0.75:1)'],
  ['balanced', 'Square or nearly square (around 1.2:1)'],
  ['wide', 'Wide rectangle (around 1.8:1)'],
  ['panoramic', 'Very wide rectangle (around 2.4:1)']
]);

export function normalizeCompassQuestion(question = {}) {
  return {
    goal: ['find', 'verify', 'compare', 'improve'].includes(question.goal) ? question.goal : 'find',
    triangle: Object.hasOwn(TRIANGLE_PROFILES, question.triangle) ? question.triangle : 'equilateral',
    container: Object.hasOwn(CONTAINER_PROFILES, question.container) ? question.container : 'balanced'
  };
}

function rankedCandidates(records, question) {
  const normalized = normalizeCompassQuestion(question);
  const triangleMatches = records.filter(TRIANGLE_PROFILES[normalized.triangle]);
  const containerMatches = triangleMatches.filter(record => CONTAINER_PROFILES[normalized.container](record.parameters.rectangleRatio));
  const goalMatches = normalized.goal === 'improve'
    ? containerMatches.filter(record => record.evidence.state !== 'proven_optimal' && record.bounds.optimalityGap > 0)
    : containerMatches;
  const candidates = goalMatches.length ? goalMatches : (containerMatches.length ? containerMatches : triangleMatches);
  return [...candidates].sort((left, right) => {
    const leftDistance = Math.abs(left.parameters.rectangleRatio - CONTAINER_ANCHORS[normalized.container])
      + Math.abs((left.parameters.apexAngle ?? TRIANGLE_ANCHORS[normalized.triangle] ?? 0) - (TRIANGLE_ANCHORS[normalized.triangle] ?? left.parameters.apexAngle ?? 0)) / 100;
    const rightDistance = Math.abs(right.parameters.rectangleRatio - CONTAINER_ANCHORS[normalized.container])
      + Math.abs((right.parameters.apexAngle ?? TRIANGLE_ANCHORS[normalized.triangle] ?? 0) - (TRIANGLE_ANCHORS[normalized.triangle] ?? right.parameters.apexAngle ?? 0)) / 100;
    if (leftDistance !== rightDistance) return leftDistance - rightDistance;
    if (normalized.goal === 'verify') {
      const proofDifference = Number(right.evidence.state === 'proven_optimal') - Number(left.evidence.state === 'proven_optimal');
      if (proofDifference) return proofDifference;
      if (left.bounds.optimalityGap !== right.bounds.optimalityGap) return left.bounds.optimalityGap - right.bounds.optimalityGap;
    }
    if (normalized.goal === 'improve' && left.bounds.optimalityGap !== right.bounds.optimalityGap) {
      return right.bounds.optimalityGap - left.bounds.optimalityGap;
    }
    return left.id.localeCompare(right.id);
  });
}

export function matchCompassQuestion(records, question) {
  if (!Array.isArray(records) || !records.length) return { question: normalizeCompassQuestion(question), records: [] };
  const normalized = normalizeCompassQuestion(question);
  const candidates = rankedCandidates(records, normalized);
  const resultCount = normalized.goal === 'compare' ? 2 : 1;
  return { question: normalized, records: candidates.slice(0, resultCount) };
}

export function compassEvidence(record) {
  if (!record) return { label: 'No verified answer', explanation: 'The Atlas could not match this question to the verified release.' };
  if (record.evidence.state === 'proven_optimal') {
    return {
      label: 'Proven best',
      explanation: 'This verified construction reaches its rigorous upper bound, so no better packing exists for this exact Atlas problem.'
    };
  }
  return {
    label: 'Best verified result — not proven optimal',
    explanation: `This is the strongest integrity-checked construction in the Atlas for this sampled problem. A ${(record.bounds.optimalityGap * 100).toFixed(1)}% gap remains between the construction and the rigorous limit.`
  };
}

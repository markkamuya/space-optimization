function filterDescription(research = {}) {
  const parts = [];
  if (research.query) parts.push(`search “${research.query}”`);
  if (research.family && research.family !== 'all') parts.push(`${research.family} triangles`);
  if (research.evidence && research.evidence !== 'all') parts.push(research.evidence.replaceAll('_', ' '));
  return parts.length ? parts.join(', ') : 'all verified records';
}

export function buildResearchTrail({ map, research, comparison, activeRecord = null, includeComparison = false, verified = false } = {}) {
  const mapValue = `${Number(map?.angle ?? 60).toFixed(0)}° triangle · ${Number(map?.ratio ?? 1.5).toFixed(2)}:1 rectangle`;
  const steps = [
    { id: 'problem', label: 'Selected problem', value: mapValue, href: '#map' },
    { id: 'filters', label: 'Evidence view', value: filterDescription(research), href: '#research' }
  ];
  if (activeRecord) steps.push({ id: 'record', label: 'Inspected record', value: activeRecord, href: `#research?record=${encodeURIComponent(activeRecord)}` });
  if (includeComparison && comparison?.left && comparison?.right) steps.push({ id: 'comparison', label: 'Comparison', value: `${comparison.left} vs ${comparison.right}`, href: '#compare' });
  return {
    verified,
    status: verified ? 'Trail linked to the integrity-checked release' : 'Context only — verified release identity unavailable',
    steps
  };
}

export function researchTrailSummary(trail) {
  if (!trail?.verified) return null;
  return trail.steps.map((step, index) => `${index + 1}. ${step.label}: ${step.value}`).join('\n');
}

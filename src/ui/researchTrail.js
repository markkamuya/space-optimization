function filterDescription(research = {}) {
  const parts = [];
  if (research.query) parts.push(`search “${research.query}”`);
  if (research.family && research.family !== 'all') parts.push(`${research.family} triangles`);
  if (research.evidence && research.evidence !== 'all') parts.push(research.evidence.replaceAll('_', ' '));
  return parts.length ? parts.join(', ') : 'all verified records';
}

function mapHref(map = {}) {
  const params = new URLSearchParams();
  params.set('angle', Number(map.angle ?? 60).toFixed(0));
  params.set('ratio', String(Number(map.ratio ?? 1.5)));
  if (map.record) params.set('record', map.record);
  if (map.view && map.view !== 'overview') params.set('view', map.view);
  return `#map?${params}`;
}

function researchHref(research = {}, record = null) {
  const params = new URLSearchParams();
  if (research.query) params.set('q', research.query);
  if (research.family && research.family !== 'all') params.set('family', research.family);
  if (research.evidence && research.evidence !== 'all') params.set('evidence', research.evidence);
  if (record) params.set('record', record);
  const suffix = params.toString();
  return `#research${suffix ? `?${suffix}` : ''}`;
}

function comparisonHref(comparison = {}) {
  const params = new URLSearchParams();
  if (comparison.left) params.set('a', comparison.left);
  if (comparison.right) params.set('b', comparison.right);
  return `#compare?${params}`;
}

export function buildResearchTrail({ map, research, comparison, activeRecord = null, includeComparison = false, verified = false } = {}) {
  const mapValue = `${Number(map?.angle ?? 60).toFixed(0)}° triangle · ${Number(map?.ratio ?? 1.5).toFixed(2)}:1 rectangle`;
  const steps = [
    { id: 'problem', label: 'Selected problem', value: mapValue, href: mapHref(map) },
    { id: 'filters', label: 'Evidence view', value: filterDescription(research), href: researchHref(research) }
  ];
  if (activeRecord) steps.push({ id: 'record', label: 'Inspected record', value: activeRecord, href: researchHref(research, activeRecord) });
  if (includeComparison && comparison?.left && comparison?.right) steps.push({ id: 'comparison', label: 'Comparison', value: `${comparison.left} vs ${comparison.right}`, href: comparisonHref(comparison) });
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

export function createResearchTrailReport(trail, { release, integrity, records = [] } = {}) {
  if (!trail?.verified || !release?.version || !integrity?.digest) return null;
  const boundedRecords = records.slice(0, 3).map(record => ({
    id: record.id,
    experimentId: record.experimentId,
    evidence: record.evidence,
    fingerprint: record.verification?.fingerprint,
    reproductionCommand: record.reproducibility?.command,
    citations: Array.isArray(record.evidence?.citations) ? record.evidence.citations : []
  }));
  return {
    format: 'triangle-packing-research-trail/v1',
    release: { version: release.version, releasedAt: release.releasedAt },
    integrity: { algorithm: integrity.algorithm, digest: integrity.digest, artifact: integrity.artifact },
    assumptions: [
      'Every evidence statement applies only to the exact triangle, rectangle, permissions, and coordinates identified by its record.',
      'Verified best known does not mean globally optimal.',
      'This trail records research context; it does not create new scientific evidence.'
    ],
    steps: trail.steps.map(({ id, label, value }) => ({ id, label, value })),
    records: boundedRecords
  };
}

export function researchTrailReportSummary(report) {
  if (!report) return null;
  const steps = report.steps.map((step, index) => `${index + 1}. ${step.label}: ${step.value}`).join('\n');
  const records = report.records.length
    ? `\nVerified records:\n${report.records.map(record => `- ${record.id}: ${record.evidence.state}; reproduce with ${record.reproductionCommand}`).join('\n')}`
    : '\nVerified records: none opened in this trail.';
  return `Triangle Packing Atlas research trail\nRelease ${report.release.version}\nIntegrity ${report.integrity.algorithm}: ${report.integrity.digest}\n\n${steps}${records}\n\nScope: ${report.assumptions.join(' ')}`;
}

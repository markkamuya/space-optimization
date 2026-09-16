export function workshopEntryState({ source = null, linkedRecord = null, baseline = null, releaseVersion = null } = {}) {
  const visible = source === 'compass' && Boolean(baseline?.id) && linkedRecord === baseline.id && Boolean(releaseVersion);
  if (!visible) return { visible: false };
  const fill = Number(baseline.verification?.utilization);
  const gap = Number(baseline.bounds?.optimalityGap);
  return {
    visible: true,
    recordId: baseline.id,
    title: `Ready to explore ${baseline.problem.name}`,
    summary: `The verified ${baseline.id} construction is your unchanged starting point. Moving a triangle creates a local draft only; it is not a verified improvement, proof, or publication.`,
    release: `Release ${releaseVersion}`,
    fill: Number.isFinite(fill) ? fill : null,
    gap: Number.isFinite(gap) ? gap : null
  };
}

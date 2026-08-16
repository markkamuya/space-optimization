export function phaseGridDestination({ key, index, columns, count, ctrlKey = false }) {
  if (!Number.isInteger(index) || index < 0 || index >= count) return null;
  if (key === 'ArrowRight') return Math.min(count - 1, index + 1);
  if (key === 'ArrowLeft') return Math.max(0, index - 1);
  if (key === 'ArrowDown') return Math.min(count - 1, index + columns);
  if (key === 'ArrowUp') return Math.max(0, index - columns);
  if (key === 'Home') return ctrlKey ? 0 : index - (index % columns);
  if (key === 'End') return ctrlKey ? count - 1 : Math.min(count - 1, index + columns - 1 - (index % columns));
  return null;
}

export function describePhaseSelection({ angle, ratio, phase, nearestDistance = null }) {
  const filled = `${(phase.utilization * 100).toFixed(1)}%`;
  const empty = `${((1 - phase.utilization) * 100).toFixed(1)}%`;
  const evidence = nearestDistance == null
    ? 'This is a modeled preview, not a verified sampled result.'
    : `The nearest verified sample is ${nearestDistance.toFixed(3)} normalized units away.`;
  return `${angle} degree triangle in a ${ratio.toFixed(2)} to 1 rectangle. ${phase.name}. ${phase.status}. ${filled} filled and ${empty} empty. ${evidence}`;
}

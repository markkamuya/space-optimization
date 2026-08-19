export const COMPARISON_WORKSPACE_FORMAT = 'triangle-packing-atlas-comparison-workspace/v1';
export const COMPARISON_WORKSPACE_LIMIT = 6;

function uniqueAvailableIds(ids, availableIds) {
  const available = availableIds instanceof Set ? availableIds : new Set(availableIds);
  return [...new Set(Array.isArray(ids) ? ids : [])]
    .filter(id => typeof id === 'string' && available.has(id))
    .slice(0, COMPARISON_WORKSPACE_LIMIT);
}

export function restoreComparisonWorkspace(raw, availableIds, releaseVersion) {
  if (!raw) return { ids: [], removed: 0, status: 'empty' };
  let parsed;
  try {
    parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
  } catch {
    return { ids: [], removed: 0, status: 'invalid' };
  }
  if (parsed?.format !== COMPARISON_WORKSPACE_FORMAT || !Array.isArray(parsed.ids)) {
    return { ids: [], removed: 0, status: 'invalid' };
  }
  const ids = uniqueAvailableIds(parsed.ids, availableIds);
  return {
    ids,
    removed: parsed.ids.length - ids.length,
    status: parsed.releaseVersion === releaseVersion ? 'restored' : 'release_updated'
  };
}

export function serializeComparisonWorkspace(ids, availableIds, releaseVersion) {
  return JSON.stringify({
    format: COMPARISON_WORKSPACE_FORMAT,
    releaseVersion,
    ids: uniqueAvailableIds(ids, availableIds)
  });
}

export function updateComparisonWorkspace(ids, action, recordId) {
  const current = [...new Set(ids)];
  const index = current.indexOf(recordId);
  if (action === 'add') return index >= 0 || current.length >= COMPARISON_WORKSPACE_LIMIT ? current : [...current, recordId];
  if (action === 'remove') return current.filter(id => id !== recordId);
  if (index < 0) return current;
  const target = action === 'up' ? index - 1 : action === 'down' ? index + 1 : index;
  if (target < 0 || target >= current.length || target === index) return current;
  [current[index], current[target]] = [current[target], current[index]];
  return current;
}

export function beginWorkshopDrag(candidate, { pointerId, placementIndex, offsetX, offsetY }) {
  if (!candidate || !Number.isInteger(pointerId) || !Number.isInteger(placementIndex)) {
    throw new TypeError('A candidate, pointer, and placement are required.');
  }
  return {
    pointerId,
    placementIndex,
    offsetX,
    offsetY,
    before: structuredClone(candidate),
    changed: false
  };
}

export function markWorkshopDragChanged(session) {
  if (!session) throw new TypeError('An active drag session is required.');
  return { ...session, changed: true };
}

export function finishWorkshopDrag(session, candidate, { cancelled = false } = {}) {
  if (!session) return { candidate, commit: false, restored: false };
  if (cancelled) return { candidate: structuredClone(session.before), commit: false, restored: session.changed };
  return { candidate, commit: session.changed, restored: false };
}

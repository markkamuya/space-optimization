function copy(value) {
  return structuredClone(value);
}

export function createWorkshopTimeline(candidate, limit = 50) {
  if (!candidate || !Number.isInteger(limit) || limit < 1) throw new TypeError('A candidate and positive history limit are required.');
  return { past: [], present: copy(candidate), future: [], limit };
}

export function recordWorkshopState(timeline, candidate) {
  const past = [...timeline.past, copy(timeline.present)].slice(-timeline.limit);
  return { ...timeline, past, present: copy(candidate), future: [] };
}

export function undoWorkshopState(timeline) {
  if (!timeline.past.length) return timeline;
  return {
    ...timeline,
    past: timeline.past.slice(0, -1),
    present: copy(timeline.past.at(-1)),
    future: [copy(timeline.present), ...timeline.future].slice(0, timeline.limit)
  };
}

export function redoWorkshopState(timeline) {
  if (!timeline.future.length) return timeline;
  return {
    ...timeline,
    past: [...timeline.past, copy(timeline.present)].slice(-timeline.limit),
    present: copy(timeline.future[0]),
    future: timeline.future.slice(1)
  };
}

export function createWorkshopFrameCoalescer(schedule, cancel) {
  if (typeof schedule !== 'function' || typeof cancel !== 'function') throw new TypeError('Frame scheduling functions are required.');
  let frame = null;
  let pending = null;
  function run() {
    frame = null;
    const task = pending;
    pending = null;
    task?.();
  }
  return {
    request(task) {
      pending = task;
      if (frame === null) frame = schedule(run);
    },
    flush() {
      if (frame !== null) cancel(frame);
      run();
    },
    cancel() {
      if (frame !== null) cancel(frame);
      frame = null;
      pending = null;
    },
    pending() { return frame !== null; }
  };
}

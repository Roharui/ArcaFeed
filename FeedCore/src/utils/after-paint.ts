/** Yield to the first paint without holding the application's command queue. */
export function afterPaint(task: () => void, appName = 'Feed'): () => void {
  let finished = false;
  let frame: number | undefined;
  let timer: ReturnType<typeof setTimeout>;
  const cancel = () => {
    finished = true;
    clearTimeout(timer);
    if (frame !== undefined) cancelAnimationFrame(frame);
  };
  const run = () => {
    if (finished) return;
    cancel();
    try {
      task();
    } catch (error) {
      console.error(`[${appName}] Deferred initialization failed:`, error);
    }
  };
  // Background tabs may not receive animation frames.
  timer = setTimeout(run, 200);
  frame = requestAnimationFrame(() => {
    frame = undefined;
    clearTimeout(timer);
    timer = setTimeout(run, 0);
  });
  return cancel;
}

export function createAfterPaint(
  appName: string,
): (task: () => void) => () => void {
  return (task) => afterPaint(task, appName);
}

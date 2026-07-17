type PrintableRoot = { querySelectorAll(selector: string): ArrayLike<HTMLImageElement> };

type Timer = ReturnType<typeof setTimeout>;
type ReadinessOptions = {
  timeoutMs?: number;
  setTimer?: (callback: () => void, milliseconds: number) => Timer;
  clearTimer?: (timer: Timer) => void;
  afterPaint?: () => Promise<unknown>;
};

function afterTwoPaints() {
  return new Promise<void>((resolve) => {
    requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
  });
}

export async function waitForPrintableDocument(
  root: PrintableRoot,
  fontsReady: Promise<unknown>,
  signal: AbortSignal,
  options: ReadinessOptions = {},
): Promise<boolean> {
  if (signal.aborted) return false;
  const timeoutMs = options.timeoutMs ?? 10_000;
  const setTimer = options.setTimer ?? setTimeout;
  const clearTimer = options.clearTimer ?? clearTimeout;
  const afterPaint = options.afterPaint ?? afterTwoPaints;
  const pendingCleanups = new Set<() => void>();
  const waitForImage = (image: HTMLImageElement) => new Promise<boolean>((resolve) => {
    if (image.complete) { resolve(true); return; }
    const cleanup = () => {
      image.removeEventListener('load', settle);
      image.removeEventListener('error', settle);
      signal.removeEventListener('abort', abort);
      pendingCleanups.delete(cleanup);
    };
    const settle = () => { cleanup(); resolve(true); };
    const abort = () => { cleanup(); resolve(false); };
    pendingCleanups.add(cleanup);
    image.addEventListener('load', settle, { once: true });
    image.addEventListener('error', settle, { once: true });
    signal.addEventListener('abort', abort, { once: true });
  });

  let timeout: Timer;
  const timedOut = new Promise<boolean>((resolve) => {
    timeout = setTimer(() => {
      for (const cleanup of pendingCleanups) cleanup();
      void afterPaint().then(() => resolve(true));
    }, timeoutMs);
  });
  const resolveAbort = (resolve: (value: boolean) => void) => () => resolve(false);
  let abortReadiness: () => void;
  const aborted = new Promise<boolean>((resolve) => {
    abortReadiness = resolveAbort(resolve);
    signal.addEventListener('abort', abortReadiness, { once: true });
  });
  const ready = (async () => {
    await fontsReady;
    if (signal.aborted) return false;
    const results = await Promise.all(Array.from(root.querySelectorAll('img')).map(waitForImage));
    if (signal.aborted || !results.every(Boolean)) return false;
    await afterPaint();
    return !signal.aborted;
  })();

  const result = await Promise.race([ready, timedOut, aborted]);
  clearTimer(timeout!);
  signal.removeEventListener('abort', abortReadiness!);
  for (const cleanup of pendingCleanups) cleanup();
  return result && !signal.aborted;
}

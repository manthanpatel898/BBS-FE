type PrintableRoot = { querySelectorAll(selector: string): ArrayLike<HTMLImageElement> };

export async function waitForPrintableDocument(
  root: PrintableRoot,
  fontsReady: Promise<unknown>,
  signal: AbortSignal,
): Promise<boolean> {
  if (signal.aborted) return false;
  const waitForImage = (image: HTMLImageElement) => new Promise<boolean>((resolve) => {
    if (image.complete) { resolve(true); return; }
    const cleanup = () => {
      image.removeEventListener('load', settle);
      image.removeEventListener('error', settle);
      signal.removeEventListener('abort', abort);
    };
    const settle = () => { cleanup(); resolve(true); };
    const abort = () => { cleanup(); resolve(false); };
    image.addEventListener('load', settle, { once: true });
    image.addEventListener('error', settle, { once: true });
    signal.addEventListener('abort', abort, { once: true });
  });
  await fontsReady;
  if (signal.aborted) return false;
  const results = await Promise.all(Array.from(root.querySelectorAll('img')).map(waitForImage));
  return !signal.aborted && results.every(Boolean);
}

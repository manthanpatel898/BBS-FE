type ShareDataLike = { title?: string; files?: File[] };
type NavigatorShareLike = {
  share?: (data: ShareDataLike) => Promise<void> | void;
  canShare?: (data: ShareDataLike) => boolean;
};

export type PreparedPdf = { blob: Blob; filename: string };
export type PdfShareStatus = 'idle' | 'preparing' | 'ready' | 'sharing' | 'error';

function pdfFile(blob: Blob, filename: string): File {
  return new File([blob], filename, { type: 'application/pdf' });
}

export function canSharePdf(
  navigatorLike: NavigatorShareLike | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): boolean {
  if (!navigatorLike?.share || !navigatorLike.canShare || typeof File === 'undefined') return false;
  try {
    return navigatorLike.canShare({ files: [pdfFile(new Blob([], { type: 'application/pdf' }), 'proposal.pdf')] });
  } catch {
    return false;
  }
}

export async function sharePdf(
  blob: Blob,
  filename: string,
  title: string,
  navigatorLike: NavigatorShareLike | undefined = typeof navigator === 'undefined' ? undefined : navigator,
): Promise<void> {
  if (!navigatorLike?.share || !navigatorLike.canShare) throw new Error('PDF sharing is not supported on this device.');
  const file = pdfFile(blob, filename);
  if (!navigatorLike.canShare({ files: [file] })) throw new Error('PDF sharing is not supported on this device.');
  try {
    await navigatorLike.share({ title, files: [file] });
  } catch (reason) {
    if (reason instanceof DOMException && reason.name === 'AbortError') return;
    throw reason;
  }
}

export function createPdfShareController(options: {
  download: (signal: AbortSignal) => Promise<PreparedPdf>;
  share: (document: PreparedPdf) => Promise<void> | void;
  onStatus: (status: PdfShareStatus) => void;
  onError: (message: string) => void;
}) {
  let prepared: PreparedPdf | null = null;
  let request: { id: symbol; controller: AbortController } | null = null;
  let sharing = false;

  return {
    prepare(): Promise<void> | false {
      if (prepared || request) return false;
      const current = { id: Symbol('pdf-share'), controller: new AbortController() };
      request = current;
      options.onError('');
      options.onStatus('preparing');
      return options.download(current.controller.signal).then((document) => {
        if (request?.id !== current.id || current.controller.signal.aborted) return;
        prepared = document;
        options.onStatus('ready');
      }).catch((reason: unknown) => {
        if (request?.id !== current.id || current.controller.signal.aborted) return;
        options.onStatus('error');
        options.onError(reason instanceof Error ? reason.message : 'Unable to prepare the decoration proposal for sharing.');
      }).finally(() => {
        if (request?.id === current.id) request = null;
      });
    },
    share(): Promise<void> | false {
      if (!prepared || sharing) return false;
      sharing = true;
      options.onError('');
      options.onStatus('sharing');

      let result: Promise<void> | void;
      try {
        // Keep this invocation synchronous. Mobile Safari requires navigator.share()
        // to run in the same user-activation task as the button tap.
        result = options.share(prepared);
      } catch (reason) {
        sharing = false;
        options.onStatus('ready');
        options.onError(reason instanceof Error ? reason.message : 'Unable to share the decoration proposal.');
        return Promise.resolve();
      }

      return Promise.resolve(result).catch((reason: unknown) => {
        options.onError(reason instanceof Error ? reason.message : 'Unable to share the decoration proposal.');
      }).finally(() => {
        sharing = false;
        options.onStatus('ready');
      });
    },
    abort(): void {
      request?.controller.abort();
      request = null;
      prepared = null;
      sharing = false;
      options.onStatus('idle');
    },
  };
}

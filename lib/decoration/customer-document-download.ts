export type DownloadedPdf = { blob: Blob; filename: string };
type FetchLike = (input: string, init: RequestInit) => Promise<Response>;

const FALLBACK_PDF_FILENAME = 'decoration-proposal.pdf';

export function getCustomerPdfFilename(disposition: string | null): string {
  const encoded = disposition?.match(/filename\*=UTF-8''([^;]+)/i)?.[1];
  const plain = disposition?.match(/filename\s*=\s*"([^"]+)"/i)?.[1]
    ?? disposition?.match(/filename\s*=\s*([^;]+)/i)?.[1];
  let candidate: string | undefined;

  try {
    candidate = encoded ? decodeURIComponent(encoded) : plain?.trim();
  } catch {
    return FALLBACK_PDF_FILENAME;
  }

  candidate = candidate
    ?.split(/[\\/]/)
    .pop()
    ?.replace(/[\u0000-\u001f\u007f<>:"|?*]/g, '-')
    .replace(/\s+/g, ' ')
    .trim()
    .slice(0, 180);

  return candidate && /\.pdf$/i.test(candidate) ? candidate : FALLBACK_PDF_FILENAME;
}

export async function requestDecorationCustomerPdf(options: {
  apiUrl: string;
  accessToken: string;
  bookingId: string;
  signal?: AbortSignal;
  fetchImpl: FetchLike;
  notifySessionExpired: () => void;
  shouldInvalidateSession: (status: number, message: string) => boolean;
}): Promise<DownloadedPdf> {
  const response = await options.fetchImpl(
    `${options.apiUrl}/decoration/bookings/${encodeURIComponent(options.bookingId)}/customer-document.pdf`,
    { headers: { Authorization: `Bearer ${options.accessToken}` }, signal: options.signal },
  );

  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: unknown } | null;
    const message = typeof payload?.message === 'string' && payload.message.trim()
      ? payload.message
      : 'Unable to download the decoration proposal.';
    if (options.shouldInvalidateSession(response.status, message)) options.notifySessionExpired();
    throw new Error(message);
  }

  const contentType = response.headers.get('Content-Type')?.split(';', 1)[0].trim().toLowerCase();
  if (contentType !== 'application/pdf') {
    throw new Error('The server returned an invalid PDF response. Please try again.');
  }
  return {
    blob: await response.blob(),
    filename: getCustomerPdfFilename(response.headers.get('Content-Disposition')),
  };
}

export function createPdfDownloadController(options: {
  download: (signal: AbortSignal) => Promise<DownloadedPdf>;
  save: (result: DownloadedPdf) => void;
  onBusy: (busy: boolean) => void;
  onError: (message: string) => void;
}) {
  let current: { id: symbol; controller: AbortController } | null = null;
  return {
    start(): Promise<void> | false {
      if (current) return false;
      const request = { id: Symbol('download'), controller: new AbortController() };
      current = request;
      options.onBusy(true);
      options.onError('');
      return options.download(request.controller.signal).then((result) => {
        if (current?.id === request.id && !request.controller.signal.aborted) options.save(result);
      }).catch((reason: unknown) => {
        if (current?.id === request.id && !request.controller.signal.aborted) {
          options.onError(reason instanceof Error ? reason.message : 'Unable to download the decoration proposal.');
        }
      }).finally(() => {
        if (current?.id === request.id) {
          current = null;
          options.onBusy(false);
        }
      });
    },
    abort() {
      if (!current) return;
      current.controller.abort();
      current = null;
      options.onBusy(false);
    },
  };
}

export function saveDownloadedPdf(result: DownloadedPdf): void {
  const objectUrl = window.URL.createObjectURL(result.blob);
  const link = document.createElement('a');
  link.href = objectUrl;
  link.download = result.filename;

  try {
    document.body.appendChild(link);
    link.click();
  } finally {
    link.remove();
    window.URL.revokeObjectURL(objectUrl);
  }
}

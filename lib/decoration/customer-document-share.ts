type ShareDataLike = { title?: string; files?: File[] };
type NavigatorShareLike = {
  share?: (data: ShareDataLike) => Promise<void> | void;
  canShare?: (data: ShareDataLike) => boolean;
};

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

export type DownloadedPdf = { blob: Blob; filename: string };

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

'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationCustomerDocumentView } from '@/components/decoration/decoration-customer-document';
import { fetchDecorationCustomerDocument } from '@/lib/auth/api';
import type { DecorationCustomerDocument } from '@/lib/auth/types';
import { waitForPrintableDocument } from '@/lib/decoration/customer-document-print-readiness';

export default function Page() {
  const params = useSearchParams();
  const bookingId = params.get('bookingId')?.trim() ?? '';
  const requestedMode = params.get('mode') ?? '';
  const mode = requestedMode === 'print' ? 'print' : 'view';
  const { accessToken } = useAuth();
  const [document, setDocument] = useState<DecorationCustomerDocument | null>(null);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);
  const printableRoot = useRef<HTMLElement | null>(null);

  const retry = useCallback(() => {
    setError('');
    setAttempt((value) => value + 1);
  }, []);

  useEffect(() => {
    if (!accessToken || !bookingId) return;
    let active = true;
    setDocument(null);
    setError('');
    fetchDecorationCustomerDocument(accessToken, bookingId)
      .then((value) => { if (active) setDocument(value); })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load customer document.'); });
    return () => { active = false; };
  }, [accessToken, attempt, bookingId]);

  useEffect(() => {
    if (!document || mode !== 'print') return;
    const root = printableRoot.current;
    if (!root) return;
    const controller = new AbortController();
    void waitForPrintableDocument(root, window.document.fonts.ready, controller.signal)
      .then((ready) => { if (ready) window.print(); });
    return () => controller.abort();
  }, [document, mode]);

  if (!bookingId) return <Message text="Booking ID is missing." />;
  if (error) return <Message text={error} onRetry={retry} />;
  if (!document) return <Message text="Preparing print view…" />;

  return (
    <main ref={printableRoot} data-decoration-print-document className="min-h-screen bg-slate-100 py-4 text-slate-900 sm:px-4 sm:py-8 print:bg-white print:p-0">
      <div className="mx-auto mb-4 flex max-w-[210mm] flex-wrap items-center justify-between gap-3 rounded-xl bg-white p-3 shadow-sm print:hidden">
        <div>
          <p className="text-sm font-bold">Customer decoration document</p>
          <p className="text-xs text-slate-500">Review the proposal or print it when ready.</p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button type="button" onClick={() => window.print()} className="min-h-11 rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white focus-visible:outline-2 focus-visible:outline-offset-2">Print</button>
          <Link href={`/decoration/event-detail?bookingId=${encodeURIComponent(document.booking.id)}`} className="flex min-h-11 items-center rounded-lg border bg-white px-4 py-2 text-sm font-semibold focus-visible:outline-2 focus-visible:outline-offset-2">Back</Link>
        </div>
      </div>
      <DecorationCustomerDocumentView document={document} />
    </main>
  );
}

function Message({ text, onRetry }: { text: string; onRetry?: () => void }) {
  return (
    <main className="grid min-h-screen place-items-center p-8 text-center text-slate-600">
      <div>
        <p role={onRetry ? 'alert' : undefined}>{text}</p>
        {onRetry ? <button type="button" onClick={onRetry} className="mt-4 min-h-11 rounded-lg bg-slate-900 px-4 py-2 font-semibold text-white">Retry</button> : null}
      </div>
    </main>
  );
}

'use client';

import { useCallback } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationPdfViewer } from '@/components/decoration/decoration-print-button';
import { downloadDecorationCustomerPdf } from '@/lib/auth/api';
import { decorationEventsUrl } from '@/lib/decoration/overlay-query';

export default function Page() {
  const params = useSearchParams();
  const bookingId = params.get('bookingId')?.trim() ?? '';
  const requestedMode = params.get('mode') ?? '';
  const returnDate = params.get('returnDate')?.trim() ?? '';
  const mode = requestedMode === 'print' ? 'print' : 'view';
  const { accessToken } = useAuth();
  const loadPdf = useCallback((signal: AbortSignal) => {
    if (!accessToken || !bookingId) return Promise.reject(new Error('Your session or booking reference is unavailable.'));
    return downloadDecorationCustomerPdf(accessToken, bookingId, signal);
  }, [accessToken, bookingId]);

  if (!bookingId) return <Message text="Booking ID is missing." />;

  return <DecorationPdfViewer
    mode={mode}
    returnHref={decorationEventsUrl({ date: returnDate || null, bookingId })}
    loadPdf={loadPdf}
  />;
}

function Message({ text }: { text: string }) {
  return <main className="grid min-h-[100dvh] place-items-center p-8 text-center text-slate-600"><p role="alert">{text}</p></main>;
}

'use client';

import { Suspense } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { DecorationEventDetailModal } from '@/components/decoration/decoration-event-detail-modal';

export default function DecorationEventDetailPage() {
  return <Suspense fallback={<State title="Loading event" message="Fetching the latest booking…" />}><EventDetailContent /></Suspense>;
}

function EventDetailContent() {
  const params = useSearchParams();
  const bookingId = params.get('id')?.trim() || params.get('bookingId')?.trim() || '';
  if (!bookingId) return <State title="Booking ID is missing" message="Open Event Detail from the decoration calendar." />;
  return <DecorationEventDetailModal bookingId={bookingId} />;
}

function State({ title, message }: { title: string; message: string }) {
  return <main className="mx-auto max-w-xl p-8 text-center"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-500">{message}</p><Link href="/decoration/events" className="mt-5 inline-block rounded-xl bg-slate-900 px-4 py-2.5 text-white">Back to events</Link></main>;
}

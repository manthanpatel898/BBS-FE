'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationSnapshotGallery } from '@/components/decoration/decoration-snapshot-gallery';
import { fetchDecorationCustomerDocument } from '@/lib/auth/api';
import type { DecorationBooking } from '@/lib/auth/types';

const formatDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'long', year: 'numeric' });

export default function Page() {
  const params = useSearchParams();
  const bookingId = params.get('bookingId')?.trim() ?? '';
  const mode = ['view', 'download', 'print'].includes(params.get('mode') ?? '') ? params.get('mode')! : 'view';
  const { accessToken, user } = useAuth();
  const [booking, setBooking] = useState<DecorationBooking | null>(null);
  const [error, setError] = useState('');
  useEffect(() => { if (!accessToken || !bookingId) return; let active = true; fetchDecorationCustomerDocument(accessToken, bookingId).then((value) => { if (active) setBooking(value); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load customer document.'); }); return () => { active = false; }; }, [accessToken, bookingId]);
  useEffect(() => { if (booking && (mode === 'download' || mode === 'print')) window.setTimeout(() => window.print(), 250); }, [booking, mode]);
  if (!bookingId) return <Message text="Booking ID is missing." />;
  if (error) return <Message text={error} />;
  if (!booking) return <Message text="Preparing print view…" />;
  return <main className="mx-auto min-h-screen max-w-5xl bg-white p-4 text-slate-900 sm:p-8 print:max-w-none print:p-0">
    <div className="mb-6 flex flex-wrap items-center justify-between gap-3 rounded-xl bg-slate-100 p-3 print:hidden"><div><p className="text-sm font-bold">Customer decoration document</p><p className="text-xs text-slate-500">Choose “Save as PDF” in the print dialog to download a PDF.</p></div><div className="flex flex-wrap gap-2"><button type="button" onClick={() => window.print()} className="rounded-lg bg-slate-900 px-4 py-2 text-sm font-semibold text-white">Download PDF / Print</button><Link href={`/decoration/event-detail?bookingId=${encodeURIComponent(booking.id)}`} className="rounded-lg border bg-white px-3 py-2 text-sm font-semibold">Back</Link></div></div>
    <header className="mb-8 border-b-2 border-slate-900 pb-5"><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Decoration Proposal</p><div className="mt-2 flex items-start justify-between gap-4"><div><h1 className="text-3xl font-bold">{booking.functionName}</h1><p className="mt-1 text-slate-500">{booking.bookingNumber}</p></div><p className="text-right text-sm font-semibold">{user?.restaurantId ? 'Event Decoration' : 'Decoration Management'}</p></div></header>
    <section className="mb-8 grid gap-5 rounded-2xl border p-5 sm:grid-cols-2 print:grid-cols-2"><Details title="Customer" rows={[["Name", booking.customer.name], ["Mobile", booking.customer.mobile]]} /><Details title="Event & venue" rows={[["Date", booking.startDate === booking.endDate ? formatDate(booking.startDate) : `${formatDate(booking.startDate)} – ${formatDate(booking.endDate)}`], ["Time", `${booking.startTime} – ${booking.endTime}`], ["Venue", booking.venue.name], ["Hall", booking.hall?.name || 'Not applicable'], ["Address", booking.address || 'Not provided']]} /></section>
    <section><div className="mb-5"><h2 className="text-2xl font-bold">Selected Decoration</h2><p className="mt-1 text-sm text-slate-500">{booking.decorationSnapshot?.length ?? 0} selected items</p></div><DecorationSnapshotGallery lines={booking.decorationSnapshot ?? []} printable /></section>
    <footer className="mt-10 border-t pt-4 text-center text-xs text-slate-400">Generated from immutable event snapshot · {booking.bookingNumber}</footer>
    <style jsx global>{`@media print { @page { size: A4; margin: 12mm; } body { background: white !important; } nav, aside { display: none !important; } .decoration-print-group { break-inside: avoid-page; margin-bottom: 8mm; } .decoration-print-item { break-inside: avoid; box-shadow: none !important; } img { print-color-adjust: exact; -webkit-print-color-adjust: exact; } }`}</style>
  </main>;
}

function Message({ text }: { text: string }) { return <main className="p-8 text-center text-slate-600">{text}</main>; }
function Details({ title, rows }: { title: string; rows: Array<[string, string]> }) { return <div><h2 className="mb-2 font-bold">{title}</h2><dl className="space-y-1 text-sm">{rows.map(([label, value]) => <div key={label} className="grid grid-cols-[90px_1fr] gap-2"><dt className="text-slate-500">{label}</dt><dd className="font-medium">{value}</dd></div>)}</dl></div>; }

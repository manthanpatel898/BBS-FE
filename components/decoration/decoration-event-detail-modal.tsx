'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationInquiryForm } from '@/components/decoration/decoration-inquiry-form';
import { DecorationSnapshotGallery } from '@/components/decoration/decoration-snapshot-gallery';
import { DecorationStatusBadge } from '@/components/decoration/decoration-status-badge';
import { fetchDecorationBooking } from '@/lib/auth/api';
import type { DecorationBooking } from '@/lib/auth/types';

const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const displayDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function DecorationEventDetailModal({ bookingId, initialBooking, onClose, onUpdated }: {
  bookingId: string;
  initialBooking?: DecorationBooking | null;
  onClose?: () => void;
  onUpdated?: (booking: DecorationBooking) => void;
}) {
  const { accessToken } = useAuth();
  const [booking, setBooking] = useState<DecorationBooking | null>(initialBooking?.id === bookingId ? initialBooking : null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!booking);
  const [editing, setEditing] = useState(false);

  useEffect(() => {
    if (!accessToken || !bookingId) { setLoading(false); return; }
    let active = true;
    setLoading((current) => current || !booking);
    setError('');
    fetchDecorationBooking(accessToken, bookingId)
      .then((value) => { if (active) { setBooking(value); onUpdated?.(value); } })
      .catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load event.'); })
      .finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, bookingId]); // onUpdated intentionally excluded: parent callbacks may change after cache reconciliation.

  const content = loading && !booking
    ? <State title="Loading event" message="Fetching the latest booking and decoration snapshot…" />
    : !booking
      ? <State title="Unable to open event" message={error || 'Decoration event was not found.'} />
      : <Detail booking={booking} warning={error} onEdit={() => setEditing(true)} />;

  return (
    <div className={onClose ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-900/40 p-0 backdrop-blur-sm sm:p-5' : ''} role={onClose ? 'dialog' : undefined} aria-modal={onClose ? true : undefined} aria-label={onClose ? 'Decoration event details' : undefined} onMouseDown={(event) => { if (onClose && event.target === event.currentTarget) onClose(); }}>
      <div className={onClose ? 'relative mx-auto min-h-full w-full max-w-7xl bg-slate-50 shadow-2xl sm:min-h-0 sm:rounded-3xl' : ''}>
        {onClose ? <button type="button" onClick={onClose} aria-label="Close Event Detail" className="absolute right-4 top-4 z-10 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl text-slate-500 shadow-sm hover:bg-slate-50 hover:text-slate-900">×</button> : null}
        {content}
      </div>
      {editing && booking ? <DecorationInquiryForm booking={booking} onClose={() => setEditing(false)} onSaved={(updated) => { setBooking(updated); onUpdated?.(updated); setEditing(false); }} /> : null}
    </div>
  );
}

function Detail({ booking, warning, onEdit }: { booking: DecorationBooking; warning: string; onEdit: () => void }) {
  const activities = [
    ...booking.followups.map((item) => ({ id: `followup-${item.id}`, at: item.date, title: 'Follow-up recorded', detail: item.note, actor: item.recordedBy })),
    ...booking.payments.map((item) => ({ id: `payment-${item._id}`, at: item.date, title: `Payment received · ${money(item.amount)}`, detail: item.remark || item.mode, actor: item.recordedBy })),
  ].sort((left, right) => new Date(right.at).getTime() - new Date(left.at).getTime());
  return <section className="mx-auto max-w-7xl space-y-5 p-4 pb-24 pt-20 sm:p-6 sm:pt-16 lg:p-8 lg:pt-16">
    {warning ? <p role="alert" className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Latest refresh failed. Showing the already loaded booking. {warning}</p> : null}
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-600">{booking.bookingNumber}</p><h1 className="mt-1 text-2xl font-bold text-slate-900">{booking.customer.name}</h1><p className="mt-1 text-sm text-slate-500">{booking.eventType.name}</p></div><DecorationStatusBadge status={booking.status} /></div><div className="mt-5 hidden flex-wrap gap-2 sm:flex"><Actions booking={booking} onEdit={onEdit} /></div></header>
    <div className="grid gap-5 lg:grid-cols-3"><div className="space-y-5 lg:col-span-2"><Card title="Event information"><Grid rows={[["Event type", booking.eventType.name], ["Date", booking.startDate === booking.endDate ? displayDate(booking.startDate) : `${displayDate(booking.startDate)} – ${displayDate(booking.endDate)}`], ["Time", `${booking.startTime} – ${booking.endTime}`], ["Slot", booking.timeSlot]]} /></Card><Card title="Venue"><Grid rows={[["Hotel / venue", booking.venue.name], ["Hall", booking.hall?.name || 'Not applicable'], ["Address", booking.address || 'Not provided']]} /></Card><Card title={`Decoration snapshot (${booking.decorationSnapshot?.length ?? 0})`}><DecorationSnapshotGallery lines={booking.decorationSnapshot ?? []} /></Card></div><aside className="space-y-5"><Card title="Customer"><Grid rows={[["Name", booking.customer.name], ["Mobile", booking.customer.mobile]]} /></Card><Card title="Package and payment"><Grid rows={[["Package", money(booking.packageRate)], ["Collected", money(booking.totalCollected)], ["Outstanding", money(booking.outstandingAmount)]]} /></Card><Card title={`Follow-ups (${booking.followups.length})`}>{booking.followups.length ? <div className="space-y-3">{booking.followups.slice().reverse().map((item) => <div key={item.id} className="border-b pb-3 text-sm"><p>{item.note}</p><p className="mt-1 text-xs text-slate-500">{displayDate(item.date)} · {item.recordedBy}</p></div>)}</div> : <p className="text-sm text-slate-500">No follow-ups recorded.</p>}</Card><Card title="Recent activity">{activities.length ? <div className="space-y-3">{activities.slice(0, 10).map((item) => <div key={item.id} className="border-b pb-3 text-sm"><p className="font-semibold">{item.title}</p><p className="mt-1 text-slate-600">{item.detail}</p><p className="mt-1 text-xs text-slate-400">{displayDate(item.at)} · {item.actor}</p></div>)}</div> : <p className="text-sm text-slate-500">No activity recorded.</p>}</Card></aside></div>
    <div className="fixed inset-x-0 bottom-0 z-[55] border-t bg-white/95 p-3 shadow-2xl backdrop-blur sm:hidden"><div className="flex gap-2 overflow-x-auto"><Actions booking={booking} onEdit={onEdit} /></div></div>
  </section>;
}

function Actions({ booking, onEdit }: { booking: DecorationBooking; onEdit: () => void }) {
  return <><button type="button" onClick={onEdit} className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">Edit Inquiry</button><Link href={`/decoration/selection?bookingId=${encodeURIComponent(booking.id)}`} className="shrink-0 rounded-xl bg-amber-500 px-4 py-2.5 text-sm font-semibold text-slate-950">{booking.decorationSnapshot?.length ? 'Edit Selection' : 'Choose Decoration'}</Link><Link href={`/decoration/print?bookingId=${encodeURIComponent(booking.id)}&mode=customer`} className="shrink-0 rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-900">Customer PDF</Link></>;
}
function State({ title, message }: { title: string; message: string }) { return <main className="mx-auto max-w-xl p-16 text-center"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-500">{message}</p></main>; }
function Card({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 font-bold">{title}</h2>{children}</section>; }
function Grid({ rows }: { rows: Array<[string, string]> }) { return <dl className="grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 text-sm font-medium text-slate-800">{value}</dd></div>)}</dl>; }

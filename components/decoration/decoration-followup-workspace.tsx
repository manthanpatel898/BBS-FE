'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationEventDetailModal } from '@/components/decoration/decoration-event-detail-modal';
import { DecorationFollowupModal } from '@/components/decoration/decoration-followup-modal';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { PageLoader } from '@/components/ui/page-loader';
import { fetchDecorationBookings } from '@/lib/auth/api';
import type { DecorationBooking } from '@/lib/auth/types';
import {
  buildDecorationRequiredFollowupQueue,
  decorationDateKey,
  type DecorationFollowupScheduleEntry,
  type DecorationFollowupState,
} from '@/lib/decoration/followups';

const stateMeta: Record<DecorationFollowupState, { label: string; badge: string; dot: string }> = {
  TAKEN_TODAY: { label: 'FOLLOW UP TAKEN TODAY', badge: 'border-emerald-300 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PENDING: { label: 'FOLLOW UP PENDING', badge: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  OVERDUE: { label: 'FOLLOW UP OVERDUE', badge: 'border-red-300 bg-red-50 text-red-700', dot: 'bg-red-500' },
  DUE_TODAY: { label: 'FOLLOW UP DUE TODAY', badge: 'border-orange-300 bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  SCHEDULED: { label: 'FOLLOW UP SCHEDULED', badge: 'border-blue-300 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
};

function displayDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options ?? { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`));
}

function timeLabel(value: string) {
  if (!value) return '—';
  const [hour, minute] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' })
    .format(new Date(2000, 0, 1, hour, minute));
}

function replaceBooking(current: DecorationBooking[], updated: DecorationBooking) {
  return current.map((booking) => booking.id === updated.id ? updated : booking);
}

export function DecorationFollowupWorkspace() {
  useAppPageHeader({ eyebrow: 'Followups', title: 'Followups' });
  const { accessToken } = useAuth();
  const [bookings, setBookings] = useState<DecorationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [followupBooking, setFollowupBooking] = useState<DecorationBooking | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setBookings(await fetchDecorationBookings(accessToken));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  const queue = useMemo(() => buildDecorationRequiredFollowupQueue(bookings), [bookings]);

  function updated(booking: DecorationBooking) {
    setBookings((current) => replaceBooking(current, booking));
    setFollowupBooking(null);
  }

  return (
    <div className="w-full px-3 pb-10 sm:px-6 lg:px-8">
      <section className="mb-6"><h2 className="text-2xl font-bold text-slate-900">Required Follow Ups</h2><p className="mt-2 text-sm text-slate-500">Open inquiries requiring action now. Scheduled follow-ups appear automatically on their due date.</p></section>
      {error ? <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><span>{error}</span><button onClick={() => void load()} className="rounded-lg border border-red-300 px-3 py-1.5">Retry</button></div> : null}
      {loading ? <PageLoader message="Loading follow-ups…" /> : null}
      {!loading && !error && queue.length === 0 ? <EmptyState /> : null}
      {!loading && queue.length ? <DecorationRequiredFollowupList entries={queue} onDetail={setDetailId} onFollowup={setFollowupBooking} /> : null}
      {detailId ? <DecorationEventDetailModal bookingId={detailId} initialBooking={bookings.find((booking) => booking.id === detailId)} onClose={() => setDetailId(null)} onUpdated={updated} /> : null}
      {followupBooking ? <DecorationFollowupModal booking={followupBooking} onClose={() => setFollowupBooking(null)} onSaved={updated} /> : null}
    </div>
  );
}

export function DecorationRequiredFollowupList({ entries, onDetail, onFollowup }: { entries: DecorationFollowupScheduleEntry[]; onDetail: (id: string) => void; onFollowup: (booking: DecorationBooking) => void }) {
  return <div className="grid gap-4 md:grid-cols-2 2xl:grid-cols-3">{entries.map((entry) => <FollowupCard key={entry.booking.id} entry={entry} onDetail={onDetail} onFollowup={onFollowup} />)}</div>;
}

function FollowupCard({ entry, onDetail, onFollowup }: { entry: DecorationFollowupScheduleEntry; onDetail: (id: string) => void; onFollowup: (booking: DecorationBooking) => void }) {
  const { booking, state } = entry;
  const meta = stateMeta[state];
  const location = [booking.venue.name, booking.hall?.name].filter(Boolean).join(' / ');
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950 sm:text-xl">{booking.customer.name}</h3><p className="mt-1 font-medium text-slate-600">{booking.eventType.name}</p></div><span className={`rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide ${meta.badge}`}>{meta.label}</span></div>
    <dl className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><Info label="Mobile" value={booking.customer.mobile} /><Info label="Venue" value={location || '—'} /><Info label="Event date" value={`${displayDate(decorationDateKey(booking.startDate))}${decorationDateKey(booking.endDate) !== decorationDateKey(booking.startDate) ? ` – ${displayDate(decorationDateKey(booking.endDate))}` : ''}`} /><Info label="Time" value={`${timeLabel(booking.startTime)} – ${timeLabel(booking.endTime)} · ${booking.timeSlot}`} /></dl>
    {entry.followup?.note ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><strong>Latest note:</strong> {entry.followup.note}</p> : null}
    <div className="mt-4 flex flex-wrap gap-2"><a href={`tel:${booking.customer.mobile}`} aria-label={`Call ${booking.customer.name}`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Call</a><button onClick={() => onDetail(booking.id)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">View Details</button><button onClick={() => onFollowup(booking)} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-500">Add Follow-up</button></div>
  </article>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="inline font-semibold text-slate-900">{label}: </dt><dd className="inline">{value}</dd></div>; }
function EmptyState() { return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h2 className="mt-4 text-2xl font-bold text-slate-950">All caught up</h2><p className="mt-2 text-slate-600">No active decoration inquiries require a follow-up.</p></div>; }

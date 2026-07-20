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
  buildDecorationFollowupSchedule,
  decorationDateKey,
  groupDecorationFollowupsByMonth,
  type DecorationFollowupScheduleEntry,
  type DecorationFollowupState,
} from '@/lib/decoration/followups';

type SelectedDay = { dateKey: string; entries: DecorationFollowupScheduleEntry[] };

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

function monthLabel(value: string) {
  return displayDate(`${value}-01`, { month: 'long', year: 'numeric' });
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

function entriesByDate(entries: DecorationFollowupScheduleEntry[]) {
  const grouped = new Map<string, DecorationFollowupScheduleEntry[]>();
  for (const entry of entries) {
    grouped.set(entry.dateKey, [...(grouped.get(entry.dateKey) ?? []), entry]);
  }
  return grouped;
}

export function DecorationFollowupWorkspace() {
  useAppPageHeader({ eyebrow: 'Followups', title: 'Followups' });
  const { accessToken } = useAuth();
  const [bookings, setBookings] = useState<DecorationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [selectedDay, setSelectedDay] = useState<SelectedDay | null>(null);
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

  const schedule = useMemo(() => buildDecorationFollowupSchedule(bookings), [bookings]);
  const months = useMemo(() => groupDecorationFollowupsByMonth(schedule), [schedule]);

  useEffect(() => {
    if (!selectedDay) return;
    const entries = schedule.filter((entry) => entry.dateKey === selectedDay.dateKey);
    if (entries.length) setSelectedDay({ dateKey: selectedDay.dateKey, entries });
    else setSelectedDay(null);
  }, [schedule, selectedDay?.dateKey]);

  function updated(booking: DecorationBooking) {
    setBookings((current) => replaceBooking(current, booking));
    setFollowupBooking(null);
  }

  return (
    <div className="mx-auto w-full max-w-[1500px] px-3 pb-10 sm:px-6 lg:px-8">
      {error ? <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><span>{error}</span><button onClick={() => void load()} className="rounded-lg border border-red-300 px-3 py-1.5">Retry</button></div> : null}
      {loading ? <PageLoader message="Loading follow-ups…" /> : null}
      {!loading && !error && months.length === 0 ? <EmptyState /> : null}
      {!loading && months.map((month) => {
        const byDate = entriesByDate(month.entries);
        return <section key={month.key} className="mb-10">
          <div className="mb-5 border-b border-slate-200 pb-3"><h2 className="text-xl font-bold text-slate-900 sm:text-2xl">{monthLabel(month.key)}</h2><div className="mt-2 h-1 w-14 rounded-full bg-amber-400" /></div>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-5 xl:grid-cols-6">
            {[...byDate.entries()].map(([dateKey, entries]) => <DayCard key={dateKey} dateKey={dateKey} entries={entries} onClick={() => setSelectedDay({ dateKey, entries })} />)}
          </div>
        </section>;
      })}
      {selectedDay ? <DaySidebar day={selectedDay} onClose={() => setSelectedDay(null)} onDetail={setDetailId} onFollowup={(booking) => setFollowupBooking(booking)} /> : null}
      {detailId ? <DecorationEventDetailModal bookingId={detailId} initialBooking={bookings.find((booking) => booking.id === detailId)} onClose={() => setDetailId(null)} onUpdated={updated} /> : null}
      {followupBooking ? <DecorationFollowupModal booking={followupBooking} onClose={() => setFollowupBooking(null)} onSaved={updated} /> : null}
    </div>
  );
}

function DayCard({ dateKey, entries, onClick }: { dateKey: string; entries: DecorationFollowupScheduleEntry[]; onClick: () => void }) {
  const inquiryCount = entries.filter(({ booking }) => booking.status === 'INQUIRY').length;
  return <button type="button" onClick={onClick} className="min-h-32 rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-400">
    <div className="flex items-start justify-between gap-2"><span className="text-3xl font-bold text-slate-900">{Number(dateKey.slice(-2))}</span><span className="rounded-full bg-amber-100 px-2.5 py-1 text-xs font-bold text-amber-800">{entries.length}</span></div>
    <p className="mt-1 text-xs font-semibold uppercase tracking-wider text-slate-500">{displayDate(dateKey, { weekday: 'short' })}</p>
    <div className="mt-4 flex flex-wrap gap-1.5" aria-label="Follow-up statuses">{entries.slice(0, 8).map((entry) => <span key={entry.booking.id} className={`h-2.5 w-2.5 rounded-full ${stateMeta[entry.state].dot}`} />)}</div>
    <p className="mt-2 text-xs text-slate-500">{inquiryCount} {inquiryCount === 1 ? 'inquiry' : 'inquiries'}</p>
  </button>;
}

function DaySidebar({ day, onClose, onDetail, onFollowup }: { day: SelectedDay; onClose: () => void; onDetail: (id: string) => void; onFollowup: (booking: DecorationBooking) => void }) {
  return <div className="fixed inset-0 z-50 bg-slate-950/45" role="dialog" aria-modal="true" aria-label={`Follow-ups for ${displayDate(day.dateKey)}`} onMouseDown={(event) => { if (event.target === event.currentTarget) onClose(); }}>
    <aside className="flex h-full w-full max-w-3xl flex-col bg-white shadow-2xl">
      <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-5 py-5 sm:px-8 sm:py-7"><div><h2 className="text-2xl font-bold text-slate-950 sm:text-3xl">{displayDate(day.dateKey)}</h2><span className="mt-3 inline-flex rounded-full bg-amber-100 px-3 py-1 text-sm font-bold text-amber-800">{day.entries.length} {day.entries.length === 1 ? 'follow-up' : 'follow-ups'}</span></div><button onClick={onClose} aria-label="Close follow-up sidebar" className="grid h-12 w-12 place-items-center rounded-full border border-slate-200 text-2xl text-slate-500 hover:bg-slate-50">×</button></header>
      <div className="min-h-0 flex-1 space-y-4 overflow-y-auto p-4 sm:p-8">{day.entries.map((entry) => <FollowupCard key={entry.booking.id} entry={entry} onDetail={onDetail} onFollowup={onFollowup} />)}</div>
    </aside>
  </div>;
}

function FollowupCard({ entry, onDetail, onFollowup }: { entry: DecorationFollowupScheduleEntry; onDetail: (id: string) => void; onFollowup: (booking: DecorationBooking) => void }) {
  const { booking, state } = entry;
  const meta = stateMeta[state];
  const location = [booking.venue.name, booking.hall?.name].filter(Boolean).join(' / ');
  return <article className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm sm:p-5">
    <div className="flex flex-wrap items-start justify-between gap-3"><div><h3 className="text-lg font-bold text-slate-950 sm:text-xl">{booking.customer.name}</h3><p className="mt-1 font-medium text-slate-600">{booking.eventType.name}</p></div><span className={`rounded-full border px-3 py-1.5 text-[11px] font-bold tracking-wide ${meta.badge}`}>{meta.label}</span></div>
    <dl className="mt-4 grid gap-2 text-sm text-slate-700 sm:grid-cols-2"><Info label="Mobile" value={booking.customer.mobile} /><Info label="Venue" value={location || '—'} /><Info label="Event date" value={`${displayDate(decorationDateKey(booking.startDate))}${decorationDateKey(booking.endDate) !== decorationDateKey(booking.startDate) ? ` – ${displayDate(decorationDateKey(booking.endDate))}` : ''}`} /><Info label="Time" value={`${timeLabel(booking.startTime)} – ${timeLabel(booking.endTime)} · ${booking.timeSlot}`} /></dl>
    {entry.followup?.note ? <p className="mt-4 rounded-xl bg-slate-50 p-3 text-sm text-slate-700"><strong>Latest note:</strong> {entry.followup.note}</p> : null}
    <div className="mt-4 flex flex-wrap gap-2"><a href={`tel:${booking.customer.mobile}`} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">Call</a><button onClick={() => onDetail(booking.id)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-bold text-slate-700 hover:bg-slate-50">View Details</button><button onClick={() => onFollowup(booking)} className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-bold text-slate-950 hover:bg-amber-500">Add Follow-up</button></div>
  </article>;
}

function Info({ label, value }: { label: string; value: string }) { return <div><dt className="inline font-semibold text-slate-900">{label}: </dt><dd className="inline">{value}</dd></div>; }
function EmptyState() { return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h2 className="mt-4 text-2xl font-bold text-slate-950">All caught up</h2><p className="mt-2 text-slate-600">No active decoration inquiries require a follow-up.</p></div>; }

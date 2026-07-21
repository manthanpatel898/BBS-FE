'use client';

import type {
  DecorationBooking,
  DecorationDashboardRecords,
  DecorationDashboardRecordType,
} from '@/lib/auth/types';
import { DecorationStatusBadge } from '@/components/decoration/decoration-status-badge';
import {
  DecorationPageEmpty,
  DecorationPageError,
  DecorationPageLoading,
} from '@/components/decoration/decoration-page-state';
import { formatIndianCurrency } from '@/lib/decoration/dashboard-view';

const meta: Record<DecorationDashboardRecordType, { title: string; empty: string }> = {
  today: { title: "Today's events", empty: 'No events are scheduled for today.' },
  upcoming: { title: 'Upcoming confirmed events', empty: 'No upcoming confirmed events.' },
  open_inquiries: { title: 'Open inquiries', empty: 'No open inquiries require attention.' },
  followups: { title: 'Follow-ups due', empty: 'The follow-up queue is clear.' },
  advance_received: { title: 'Bookings with advance received', empty: 'No advance collections found.' },
  outstanding: { title: 'Outstanding collections', empty: 'No outstanding collections found.' },
  selection_pending: { title: 'Decoration selection pending', empty: 'No confirmed events are waiting for decoration selection.' },
};

function dayKey(booking: DecorationBooking) {
  return booking.startDate.slice(0, 10);
}

function dayLabel(value: string) {
  return new Date(`${value}T00:00:00`).toLocaleDateString('en-IN', {
    weekday: 'short', day: 'numeric', month: 'long', year: 'numeric',
  });
}

export function DecorationDashboardRecordsPanel({
  type,
  records,
  loading,
  error,
  onBack,
  onRetry,
  onPageChange,
  onOpenBooking,
}: {
  type: DecorationDashboardRecordType;
  records: DecorationDashboardRecords | null;
  loading: boolean;
  error: string;
  onBack: () => void;
  onRetry: () => void;
  onPageChange: (page: number) => void;
  onOpenBooking: (booking: DecorationBooking) => void;
}) {
  const groups = (records?.items ?? []).reduce<Array<{ date: string; items: DecorationBooking[] }>>((result, booking) => {
    const date = dayKey(booking);
    const current = result.at(-1);
    if (current?.date === date) current.items.push(booking);
    else result.push({ date, items: [booking] });
    return result;
  }, []);
  const pagination = records?.pagination;

  return <section className="min-w-0 max-w-full space-y-5">
    <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="min-w-0">
        <button type="button" onClick={onBack} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 hover:border-amber-300 hover:text-amber-700">← Back to dashboard</button>
        <h2 className="mt-4 break-words text-xl font-black text-slate-950 sm:text-2xl">{meta[type].title}</h2>
        {pagination ? <p className="mt-1 text-sm text-slate-500">{pagination.total} booking{pagination.total === 1 ? '' : 's'}</p> : null}
      </div>
    </div>

    {loading ? <DecorationPageLoading message="Loading bookings…" cardCount={4} />
      : error ? <DecorationPageError message={error} onRetry={onRetry} />
      : !groups.length ? <DecorationPageEmpty title="Nothing to show" description={meta[type].empty} />
      : <div className="min-w-0 max-w-full space-y-7">
        {groups.map((group) => <div key={group.date} className="min-w-0 space-y-3">
          <div className="flex min-w-0 items-center gap-3"><h3 className="shrink-0 rounded-full bg-slate-100 px-3 py-2 text-xs font-extrabold uppercase tracking-wide text-slate-700">{dayLabel(group.date)}</h3><span className="h-px min-w-0 flex-1 bg-slate-200" /></div>
          <div className="grid min-w-0 gap-3 lg:grid-cols-2 2xl:grid-cols-3">
            {group.items.map((booking) => <button key={booking.id} type="button" onClick={() => onOpenBooking(booking)} className="min-w-0 max-w-full rounded-2xl border border-slate-200 bg-white p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:border-amber-300 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-400">
              <div className="flex min-w-0 flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0"><p className="break-words font-black text-slate-950">{booking.customer.name}</p><p className="mt-1 break-words text-sm text-slate-600">{booking.eventType.name} · {booking.venue.name}{booking.hall ? ` / ${booking.hall.name}` : ''}</p></div>
                <div className="self-start"><DecorationStatusBadge status={booking.status} /></div>
              </div>
              <p className="mt-3 text-sm font-semibold text-slate-600">{booking.startTime}–{booking.endTime} · {booking.timeSlot}</p>
              <div className="mt-4 grid grid-cols-3 gap-2 border-t border-slate-100 pt-3 text-xs">
                <div className="min-w-0"><p className="text-slate-500">Package</p><p className="break-words font-bold text-slate-900">{booking.isPackagePriceFinalized?formatIndianCurrency(booking.packageRate):'Not finalized'}</p></div>
                <div className="min-w-0"><p className="text-slate-500">Received</p><p className="break-words font-bold text-emerald-700">{formatIndianCurrency(booking.totalCollected)}</p></div>
                <div className="min-w-0"><p className="text-slate-500">Pending</p><p className="break-words font-bold text-red-700">{booking.isPackagePriceFinalized?formatIndianCurrency(booking.outstandingAmount):'Not finalized'}</p></div>
              </div>
            </button>)}
          </div>
        </div>)}
      </div>}

    {pagination && pagination.totalPages > 1 ? <div className="grid grid-cols-2 gap-3 rounded-2xl border border-slate-200 bg-white p-4 sm:flex sm:items-center sm:justify-between">
      <button type="button" disabled={loading || pagination.page <= 1} onClick={() => onPageChange(pagination.page - 1)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Previous</button>
      <p className="col-span-2 row-start-1 text-center text-sm font-semibold text-slate-600 sm:order-none">Page {pagination.page} of {pagination.totalPages}</p>
      <button type="button" disabled={loading || pagination.page >= pagination.totalPages} onClick={() => onPageChange(pagination.page + 1)} className="min-h-11 rounded-xl border border-slate-200 px-4 py-2 text-sm font-bold text-slate-700 disabled:opacity-50">Next</button>
    </div> : null}
  </section>;
}

'use client';

import Link from 'next/link';
import { useCallback, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import {
  DecorationPageEmpty,
  DecorationPageError,
  DecorationPageLoading,
} from '@/components/decoration/decoration-page-state';
import { DecorationStatusBadge } from '@/components/decoration/decoration-status-badge';
import { DecorationDashboardCharts } from '@/components/decoration/decoration-dashboard-charts';
import { fetchDecorationDashboard } from '@/lib/auth/api';
import type { DecorationDashboardData } from '@/lib/auth/types';
import {
  buildDecorationDashboardCards,
  formatIndianCurrency,
} from '@/lib/decoration/dashboard-view';
import { decorationEventsUrl } from '@/lib/decoration/overlay-query';

const cardTone = {
  amber: 'border-amber-200 bg-amber-50 text-amber-950',
  blue: 'border-blue-200 bg-blue-50 text-blue-950',
  emerald: 'border-emerald-200 bg-emerald-50 text-emerald-950',
  red: 'border-red-200 bg-red-50 text-red-950',
  slate: 'border-slate-200 bg-slate-50 text-slate-950',
  violet: 'border-violet-200 bg-violet-50 text-violet-950',
} as const;

function formatEventDate(startDate: string, endDate: string) {
  const start = new Date(`${startDate.slice(0, 10)}T00:00:00`);
  const end = new Date(`${endDate.slice(0, 10)}T00:00:00`);
  const startLabel = start.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' });
  if (startDate.slice(0, 10) === endDate.slice(0, 10)) return startLabel;
  return `${startLabel} – ${end.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}`;
}

export function DecorationDashboard() {
  const { accessToken } = useAuth();
  const [data, setData] = useState<DecorationDashboardData | null>(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setError('');
    setLoading(true);
    try {
      setData(await fetchDecorationDashboard(accessToken));
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load dashboard');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  if (loading && !data) {
    return <DecorationPageLoading message="Loading operations dashboard…" cardCount={8} />;
  }

  if (error && !data) return <DecorationPageError message={error} onRetry={() => void load()} />;

  if (!data) {
    return <DecorationPageEmpty title="Dashboard is unavailable" description="Refresh to load your decoration operations." />;
  }

  const cards = buildDecorationDashboardCards(data);

  return (
    <div className="space-y-6 text-slate-900">
      {error ? <DecorationPageError message={error} onRetry={() => void load()} /> : null}

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">
        {cards.map((card) => (
          <Link
            key={card.id}
            href={card.href}
            className={`group rounded-2xl border p-4 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${cardTone[card.tone]}`}
          >
            <div className="flex items-start justify-between gap-3">
              <p className="text-sm font-semibold">{card.label}</p>
              <span aria-hidden="true" className="text-lg transition group-hover:translate-x-0.5">→</span>
            </div>
            <p className="mt-3 text-2xl font-black tracking-tight">{card.value}</p>
            <p className="mt-1 text-xs leading-5 opacity-75">{card.description}</p>
          </Link>
        ))}
      </div>

      <DecorationDashboardCharts data={data} />

      <div className="grid gap-6 xl:grid-cols-[1.35fr_1fr]">
        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="font-bold">Upcoming confirmed events</h2><p className="text-sm text-slate-500">Next events requiring operational attention</p></div>
            <Link href="/decoration/events?scope=upcoming" className="text-sm font-bold text-amber-700 hover:text-amber-800">View all</Link>
          </div>
          {data.upcomingEvents.length ? (
            <div className="divide-y divide-slate-100">
              {data.upcomingEvents.map((booking) => (
                <Link key={booking.id} href={decorationEventsUrl({ date: booking.startDate.slice(0, 10), bookingId: booking.id })} className="block px-5 py-4 transition hover:bg-slate-50">
                  <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                    <div className="min-w-0"><p className="truncate font-bold">{booking.customer.name}</p><p className="mt-1 truncate text-sm text-slate-600">{booking.functionName} · {booking.venue.name}{booking.hall ? ` / ${booking.hall.name}` : ''}</p><p className="mt-1 text-xs font-semibold text-slate-500">{formatEventDate(booking.startDate, booking.endDate)} · {booking.startTime}–{booking.endTime}</p></div>
                    <DecorationStatusBadge status={booking.status} />
                  </div>
                </Link>
              ))}
            </div>
          ) : <DecorationPageEmpty title="No upcoming events" description="Confirmed future events will appear here." />}
        </section>

        <section className="rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="flex items-center justify-between border-b border-slate-100 px-5 py-4">
            <div><h2 className="font-bold">Follow-up priority</h2><p className="text-sm text-slate-500">Due and overdue customer communication</p></div>
            <Link href="/decoration/followups?state=due" className="text-sm font-bold text-amber-700 hover:text-amber-800">View all</Link>
          </div>
          {data.followupPriorities.length ? (
            <div className="divide-y divide-slate-100">
              {data.followupPriorities.map(({ booking, followup, state }) => (
                <Link key={`${booking.id}-${followup?.id ?? 'pending'}`} href={decorationEventsUrl({ date: booking.startDate.slice(0, 10), bookingId: booking.id })} className="block px-5 py-4 transition hover:bg-slate-50">
                  <div className="flex items-start justify-between gap-4"><div className="min-w-0"><p className="truncate font-bold">{booking.customer.name}</p><p className="mt-1 line-clamp-2 text-sm text-slate-600">{followup?.note || 'Customer follow-up has not been recorded yet.'}</p></div><span className="shrink-0 rounded-full bg-red-50 px-2.5 py-1 text-xs font-bold text-red-700">{state === 'DUE_TODAY' ? 'Today' : state === 'OVERDUE' ? 'Overdue' : state === 'PENDING' ? 'Pending' : followup?.nextDate ? new Date(`${followup.nextDate.slice(0, 10)}T00:00:00`).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' }) : state}</span></div>
                </Link>
              ))}
            </div>
          ) : <DecorationPageEmpty title="No follow-ups due" description="The customer follow-up queue is clear." />}
        </section>
      </div>

      <section className="rounded-2xl bg-slate-950 p-5 text-white shadow-sm">
        <div className="grid gap-5 sm:grid-cols-3">
          <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Package value</p><p className="mt-2 text-xl font-black">{formatIndianCurrency(data.packageValue)}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Collected</p><p className="mt-2 text-xl font-black text-emerald-300">{formatIndianCurrency(data.collected)}</p></div>
          <div><p className="text-xs font-bold uppercase tracking-wider text-slate-400">Outstanding</p><p className="mt-2 text-xl font-black text-amber-300">{formatIndianCurrency(data.outstanding)}</p></div>
        </div>
      </section>
    </div>
  );
}

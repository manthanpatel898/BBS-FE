import type { DecorationDashboardData } from '@/lib/auth/types';

const statusLabels: Record<string, string> = {
  INQUIRY: 'Inquiries',
  CONFIRMED: 'Confirmed',
  DECORATION_SELECTION_PENDING: 'Selection pending',
  DECORATION_SELECTED: 'Decoration selected',
  IN_PROGRESS: 'In progress',
  COMPLETED: 'Completed',
  CANCELLED: 'Cancelled',
  CLOSED_INQUIRY: 'Closed inquiries',
};

function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
}

export function DecorationDashboardCharts({ data }: { data: Pick<DecorationDashboardData, 'statusDistribution' | 'sevenDayWorkload'> }) {
  const statusMax = Math.max(1, ...data.statusDistribution.map((entry) => entry.count));
  const workloadMax = Math.max(1, ...data.sevenDayWorkload.map((entry) => entry.count));
  return <div className="grid gap-6 lg:grid-cols-2">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="booking-status-title">
      <h2 id="booking-status-title" className="font-bold text-slate-950">Booking status</h2>
      <p className="mt-1 text-sm text-slate-500">Current event pipeline</p>
      <div className="mt-5 space-y-3">{data.statusDistribution.filter((entry) => entry.count > 0).map((entry) => <div key={entry.status} className="grid grid-cols-[minmax(7rem,1fr)_2fr_auto] items-center gap-3"><span className="truncate text-xs font-semibold text-slate-600">{statusLabels[entry.status] ?? entry.status}</span><div className="h-2.5 overflow-hidden rounded-full bg-slate-100"><div className="h-full rounded-full bg-slate-800" style={{ width: `${Math.max(5, entry.count / statusMax * 100)}%` }} /></div><strong className="min-w-6 text-right text-sm text-slate-950">{entry.count}</strong></div>)}</div>
    </section>
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="workload-title">
      <h2 id="workload-title" className="font-bold text-slate-950">Next 7 days</h2>
      <p className="mt-1 text-sm text-slate-500">Confirmed event workload</p>
      <div className="mt-5 flex h-40 items-end gap-2">{data.sevenDayWorkload.map((entry) => <div key={entry.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-slate-700">{entry.count}</span><div className="w-full max-w-12 rounded-t-lg bg-amber-400" style={{ height: `${Math.max(6, entry.count / workloadMax * 100)}px` }} /><span className="whitespace-nowrap text-[10px] font-semibold text-slate-500 sm:text-xs">{shortDate(entry.date)}</span></div>)}</div>
    </section>
  </div>;
}

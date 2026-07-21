import type { DecorationDashboardData } from '@/lib/auth/types';

function shortDate(date: string) {
  return new Date(`${date}T12:00:00`).toLocaleDateString('en-IN', { weekday: 'short', day: 'numeric' });
}

export function DecorationDashboardCharts({ data }: { data: Pick<DecorationDashboardData, 'sevenDayWorkload'> }) {
  const workloadMax = Math.max(1, ...data.sevenDayWorkload.map((entry) => entry.count));
  return <div className="grid gap-6">
    <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm" aria-labelledby="workload-title">
      <h2 id="workload-title" className="font-bold text-slate-950">Next 7 days</h2>
      <p className="mt-1 text-sm text-slate-500">Confirmed event workload</p>
      <div className="mt-5 flex h-40 items-end gap-2">{data.sevenDayWorkload.map((entry) => <div key={entry.date} className="flex min-w-0 flex-1 flex-col items-center justify-end gap-2"><span className="text-xs font-bold text-slate-700">{entry.count}</span><div className="w-full max-w-12 rounded-t-lg bg-amber-400" style={{ height: `${Math.max(6, entry.count / workloadMax * 100)}px` }} /><span className="whitespace-nowrap text-[10px] font-semibold text-slate-500 sm:text-xs">{shortDate(entry.date)}</span></div>)}</div>
    </section>
  </div>;
}

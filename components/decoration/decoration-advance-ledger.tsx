import type { DecorationBooking } from '@/lib/auth/types';
import { getDecorationAdvanceRows, getDecorationAdvanceSummary } from '@/lib/decoration/event-detail-view';

const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;
const date = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function DecorationAdvanceLedger({ booking }: { booking: DecorationBooking }) {
  const summary = getDecorationAdvanceSummary(booking);
  const rows = getDecorationAdvanceRows(booking);
  return <div className="space-y-4">
    <div className="grid grid-cols-3 gap-2 sm:gap-3">
      <Summary label="Package" value={money(summary.packageAmount)} />
      <Summary label="Received" value={money(summary.receivedAmount)} tone="text-emerald-700" />
      <Summary label="Pending" value={money(summary.outstandingAmount)} tone={summary.outstandingAmount ? 'text-red-700' : 'text-emerald-700'} />
    </div>
    {!rows.length ? <p className="rounded-xl bg-slate-50 px-4 py-5 text-center text-sm text-slate-500">No advance payments recorded.</p> : <>
      <div className="space-y-3 sm:hidden">{rows.map((row) => <article key={row.id} className="rounded-xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-3"><div><p className="font-bold text-slate-900">{money(row.amount)}</p><p className="text-xs text-slate-500">{date(row.date)}</p></div><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700">{row.mode}</span></div><dl className="mt-3 grid gap-2 text-sm"><div><dt className="text-xs text-slate-400">Remark</dt><dd>{row.remark}</dd></div><div><dt className="text-xs text-slate-400">Recorded by</dt><dd>{row.recordedBy}</dd></div></dl></article>)}</div>
      <div className="hidden overflow-x-auto rounded-xl border border-slate-200 sm:block"><table className="w-full min-w-[650px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wide text-slate-500"><tr><th className="px-4 py-3">Date</th><th className="px-4 py-3">Amount</th><th className="px-4 py-3">Mode</th><th className="px-4 py-3">Remark</th><th className="px-4 py-3">Recorded by</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="border-t border-slate-100"><td className="px-4 py-3">{date(row.date)}</td><td className="px-4 py-3 font-semibold text-emerald-700">{money(row.amount)}</td><td className="px-4 py-3">{row.mode}</td><td className="px-4 py-3">{row.remark}</td><td className="px-4 py-3">{row.recordedBy}</td></tr>)}</tbody></table></div>
    </>}
  </div>;
}

function Summary({ label, value, tone = 'text-slate-900' }: { label: string; value: string; tone?: string }) {
  return <div className="min-w-0 rounded-xl bg-slate-50 p-3 sm:p-4"><p className="truncate text-[10px] font-semibold uppercase tracking-wide text-slate-400 sm:text-xs">{label}</p><p className={`mt-1 break-words text-sm font-bold sm:text-lg ${tone}`}>{value}</p></div>;
}

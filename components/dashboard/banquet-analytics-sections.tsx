import { ReportCategory } from '@/lib/auth/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function FeedbackSummaryCard({ summary }: { summary: { averageRating: number; customerResponses: number; staffResponses: number; lowRatingCount: number; openFollowUpCount: number } }) {
  return <section className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-semibold text-slate-900">Guest feedback</h3><p className="mt-1 text-sm text-slate-500">Customer experience and recovery overview.</p></div><a href="/reports/feedback" className="rounded-lg bg-violet-50 px-3 py-2 text-xs font-bold text-violet-700">View report</a></div><div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4"><div><p className="text-2xl font-black text-slate-950">{summary.averageRating.toFixed(1)} ★</p><p className="text-xs text-slate-500">Average</p></div><div><p className="font-black text-slate-950">{summary.customerResponses} customer</p><p className="text-xs text-slate-500">{summary.staffResponses} staff</p></div><div><p className="font-black text-red-700">{summary.lowRatingCount} low rating</p><p className="text-xs text-slate-500">Average ≤ 2</p></div><div><p className="font-black text-amber-700">{summary.openFollowUpCount} open</p><p className="text-xs text-slate-500">Follow-ups</p></div></div></section>;
}

export function HorizontalCategoryPerformance({
  items,
}: {
  items: ReportCategory[];
}) {
  const visibleItems = items.slice(0, 5);
  const maxRevenue = Math.max(...visibleItems.map((item) => item.revenue), 1);

  return (
    <section className="min-w-0 rounded-2xl border border-slate-100 bg-white p-4 shadow-sm sm:p-5">
      <h3 className="text-lg font-semibold text-slate-900">Category Performance</h3>
      <p className="mt-1 text-sm text-slate-500">
        Top categories by confirmed booking revenue.
      </p>
      {!visibleItems.length ? (
        <p className="mt-5 rounded-xl bg-slate-50 px-4 py-5 text-sm text-slate-500">
          Category performance will appear after bookings are confirmed.
        </p>
      ) : (
        <div className="mt-5 space-y-4">
          {visibleItems.map((item) => (
            <div key={item.name} className="min-w-0">
              <div className="mb-2 flex min-w-0 items-end justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-sm font-semibold text-slate-900" title={item.name}>
                    {item.name}
                  </p>
                  <p className="text-xs text-slate-500">
                    {item.bookings} booking{item.bookings === 1 ? '' : 's'}
                  </p>
                </div>
                <p className="shrink-0 text-sm font-bold text-slate-900">
                  {formatCurrency(item.revenue)}
                </p>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-100">
                <div
                  className="h-full rounded-full bg-gradient-to-r from-amber-400 via-orange-400 to-rose-400"
                  style={{
                    width: `${Math.max((item.revenue / maxRevenue) * 100, item.revenue > 0 ? 8 : 0)}%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

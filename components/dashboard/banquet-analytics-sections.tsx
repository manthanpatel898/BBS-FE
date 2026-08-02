import { ReportCategory } from '@/lib/auth/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
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

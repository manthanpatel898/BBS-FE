'use client';

import type { MonthlySales } from '@/lib/auth/types';
import { buildMonthlySalesPresentation } from '@/lib/dashboard/banquet-dashboard-presenters';

const currency = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function MonthlySalesBoard({
  data,
  currentYear,
  currentMonth,
  onMonthOpen,
}: {
  data: MonthlySales;
  currentYear: number;
  currentMonth: number;
  onMonthOpen: (month: number) => void;
}) {
  return (
    <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_48%),linear-gradient(135deg,#f8fafc,#ffffff)] p-5 sm:p-6">
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
          <div>
            <p className="text-xs font-black uppercase tracking-[0.24em] text-emerald-700">
              Annual performance
            </p>
            <h3 className="mt-2 text-xl font-black text-slate-950">
              Monthly Sales · {data.year}
            </h3>
            <p className="mt-1 text-sm text-slate-500">
              Actual revenue and forecast from the current average plate price.
            </p>
          </div>
          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            {[
              ['Forecast', data.totals.effectiveRevenue],
              ['Actual', data.totals.actualRevenue],
              ['Estimated', data.totals.estimatedRevenue],
              ['Bookings', data.totals.bookings],
            ].map(([label, value]) => (
              <div
                key={label}
                className="min-w-0 rounded-xl border border-slate-200 bg-white px-3 py-2 shadow-sm"
              >
                <p className="text-[10px] font-bold uppercase tracking-[0.12em] text-slate-400">
                  {label}
                </p>
                <p className="mt-1 truncate text-sm font-black text-slate-950">
                  {label === 'Bookings' ? value : currency.format(Number(value))}
                </p>
              </div>
            ))}
          </div>
        </div>
        <div className="mt-4 flex flex-wrap gap-4 text-xs font-bold text-slate-600">
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-emerald-500" />
            Actual
          </span>
          <span className="inline-flex items-center gap-2">
            <span className="h-2.5 w-2.5 rounded-full bg-amber-400" />
            Estimated from average
          </span>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-3 p-4 sm:grid-cols-3 sm:p-5 lg:grid-cols-4 xl:grid-cols-6">
        {data.months.map((month) => {
          const item = buildMonthlySalesPresentation(
            month,
            currentYear,
            currentMonth,
            data.year,
          );
          return (
            <button
              key={item.month}
              type="button"
              onClick={() => onMonthOpen(item.month)}
              className={`min-w-0 rounded-2xl border p-3 text-left transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-300 ${
                item.isCurrent
                  ? 'border-amber-300 bg-amber-50/60'
                  : 'border-slate-200 bg-white'
              }`}
            >
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-black uppercase tracking-[0.12em] text-slate-600">
                  {item.label}
                </p>
                {item.isFuture ? (
                  <span className="rounded-full bg-blue-50 px-2 py-0.5 text-[9px] font-black uppercase text-blue-700">
                    Future
                  </span>
                ) : null}
              </div>
              <p className="mt-3 truncate text-base font-black text-slate-950">
                {currency.format(item.effectiveRevenue)}
              </p>
              <p className="mt-1 text-[11px] font-semibold text-slate-500">
                {item.bookings} booking{item.bookings === 1 ? '' : 's'}
              </p>
              <div
                className="mt-3 flex h-2 overflow-hidden rounded-full bg-slate-100"
                aria-label={`${item.label}: ${item.actualPercent.toFixed(0)}% actual and ${item.estimatedPercent.toFixed(0)}% estimated`}
              >
                <span
                  className="h-full bg-emerald-500"
                  style={{ width: `${item.actualPercent}%` }}
                />
                <span
                  className="h-full bg-amber-400"
                  style={{ width: `${item.estimatedPercent}%` }}
                />
              </div>
              <div className="mt-2 flex items-center justify-between gap-2 text-[10px] font-bold">
                <span className="truncate text-emerald-700">
                  {currency.format(item.actualRevenue)}
                </span>
                <span className="truncate text-amber-700">
                  {currency.format(item.estimatedRevenue)}
                </span>
              </div>
            </button>
          );
        })}
      </div>
    </section>
  );
}

'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchOrderReports } from '@/lib/auth/api';
import { OrderReports } from '@/lib/auth/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{sub}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { accessToken, user } = useAuth();
  const [reports, setReports] = useState<OrderReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken || user?.role !== 'company_admin') {
      setLoading(false);
      return;
    }

    const token = accessToken;

    async function loadReports() {
      try {
        setLoading(true);
        setError('');
        const response = await fetchOrderReports(token);
        setReports(response);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load reports.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, [accessToken, user?.role]);

  if (user?.role !== 'company_admin') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Reports are available for company admin only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
              Reports
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Booking Reports
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Track top-selling categories, busy periods, year-on-year performance, month-on-month selling, and best-selling menu items.
            </p>
          </div>
          <Link
            href="/print/reports"
            className="inline-flex items-center justify-center rounded-2xl bg-slate-900 px-5 py-3 text-sm font-semibold text-white transition hover:bg-slate-800"
          >
            Print report
          </Link>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : reports ? (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Highest Selling Category"
              value={reports.highestSellingCategories[0]?.name || 'No data'}
              sub={
                reports.highestSellingCategories[0]
                  ? `${reports.highestSellingCategories[0].bookings} bookings`
                  : 'No sold categories yet'
              }
            />
            <MetricCard
              label="Busy Month In A Year"
              value={reports.busiestMonth.label}
              sub={`${reports.busiestMonth.bookings} bookings`}
            />
            <MetricCard
              label="Current Year Selling"
              value={formatCurrency(reports.yearComparison.current.revenue)}
              sub={`${reports.yearComparison.current.bookings} confirmed bookings`}
            />
            <MetricCard
              label="Current Month Selling"
              value={formatCurrency(reports.monthComparison.current.revenue)}
              sub={`${reports.monthComparison.current.bookings} confirmed bookings`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Highest Category Selling
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Categories performing best by sold booking count.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Bookings</th>
                      <th className="px-4 py-3 font-medium">Selling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.highestSellingCategories.length > 0 ? (
                      reports.highestSellingCategories.map((category, index) => (
                        <tr key={category.name} className={index > 0 ? 'border-t border-slate-200' : ''}>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {category.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{category.bookings}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatCurrency(category.revenue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No category sales available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Busy Month In A Year</h2>
              <p className="mt-1 text-sm text-slate-500">
                Busiest month from the current year&apos;s sold bookings.
              </p>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
                  {reports.busiestMonth.label}
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {reports.busiestMonth.bookings}
                </p>
                <p className="mt-1 text-sm text-slate-600">Bookings in that month</p>
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  {formatCurrency(reports.busiestMonth.revenue)}
                </p>
                <p className="text-sm text-slate-500">Total selling</p>
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Current Year vs Previous Year
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[reports.yearComparison.current, reports.yearComparison.previous].map((entry) => (
                  <div key={entry.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {entry.label}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {formatCurrency(entry.revenue)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{entry.bookings} bookings</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Current Month vs Previous Month
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[reports.monthComparison.current, reports.monthComparison.previous].map((entry) => (
                  <div key={entry.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {entry.label}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {formatCurrency(entry.revenue)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{entry.bookings} bookings</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Best Selling Menu Items
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Menu items selected most often across confirmed bookings.
            </p>
            <div className="mt-4 overflow-hidden rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Menu Item</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Selections</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.bestSellingMenuItems.length > 0 ? (
                    reports.bestSellingMenuItems.map((item, index) => (
                      <tr key={item.name} className={index > 0 ? 'border-t border-slate-200' : ''}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.categories.join(', ')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        No menu item sales available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </>
      ) : null}
    </div>
  );
}

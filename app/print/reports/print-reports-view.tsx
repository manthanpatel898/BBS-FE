'use client';

import { useEffect, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchOrderReports, fetchRestaurantById } from '@/lib/auth/api';
import { OrderReports, Restaurant } from '@/lib/auth/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatPrintDate(value: Date) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(value);
}

export function PrintReportsView() {
  const { accessToken, user } = useAuth();
  const [reports, setReports] = useState<OrderReports | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken || user?.role !== 'company_admin') {
      setIsLoading(false);
      setError('Reports are available for company admin only.');
      return;
    }

    const token = accessToken;
    const restaurantId = user.restaurantId;

    async function loadReports() {
      try {
        setIsLoading(true);
        setError('');
        const [reportResponse, restaurantResponse] = await Promise.all([
          fetchOrderReports(token),
          restaurantId ? fetchRestaurantById(token, restaurantId) : Promise.resolve(null),
        ]);
        setReports(reportResponse);
        setRestaurant(restaurantResponse);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load reports print view.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadReports();
  }, [accessToken, user?.restaurantId, user?.role]);

  return (
    <BookingsRoute>
      <section className="min-h-screen bg-stone-100 px-4 py-8 text-stone-900 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[220mm] space-y-6">
          <div className="flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-sm print:hidden md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                Print View
              </p>
              <h1 className="mt-2 text-3xl font-semibold">Reports Print</h1>
            </div>
            <button
              type="button"
              onClick={() => window.print()}
              className="rounded-2xl bg-stone-900 px-5 py-3 font-semibold text-white"
            >
              Print
            </button>
          </div>

          {isLoading ? (
            <div className="rounded-[28px] bg-white p-10 text-center text-stone-500 shadow-sm">
              Loading printable reports...
            </div>
          ) : error ? (
            <div className="rounded-[28px] bg-white p-10 text-center text-red-600 shadow-sm">
              {error}
            </div>
          ) : reports ? (
            <ReportPrintDocument reports={reports} restaurant={restaurant} />
          ) : null}
        </div>
      </section>
    </BookingsRoute>
  );
}

function ReportPrintDocument({
  reports,
  restaurant,
}: {
  reports: OrderReports;
  restaurant: Restaurant | null;
}) {
  const generatedAt = formatPrintDate(new Date());

  return (
    <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white px-[12mm] py-[10mm] text-stone-900 shadow-sm print:min-h-0 print:max-w-none print:px-[8mm] print:py-[8mm] print:shadow-none">
      <header className="border-b border-stone-300 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-700">
              Reports Summary
            </p>
            <h1 className="mt-2 text-[28px] font-bold leading-tight text-stone-950">
              {restaurant?.name || 'Banquate Booking System'}
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              {restaurant?.address || 'Professional booking reports summary'}
            </p>
          </div>
          <div className="min-w-[190px] rounded-[20px] border border-stone-300 bg-stone-50 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Generated On
            </p>
            <p className="mt-1 text-xl font-bold text-stone-950">{generatedAt}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Module
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-900">Reports</p>
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-3 md:grid-cols-4">
        <ReportHeroStat
          label="Highest Category"
          value={reports.highestSellingCategories[0]?.name || 'No data'}
        />
        <ReportHeroStat
          label="Busy Month"
          value={reports.busiestMonth.label}
        />
        <ReportHeroStat
          label="Current Year"
          value={formatCurrency(reports.yearComparison.current.revenue)}
        />
        <ReportHeroStat
          label="Current Month"
          value={formatCurrency(reports.monthComparison.current.revenue)}
        />
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <PrintTable
          title="Highest Category Selling"
          headings={['Category', 'Bookings', 'Selling']}
          rows={
            reports.highestSellingCategories.length > 0
              ? reports.highestSellingCategories.map((category) => [
                  category.name,
                  String(category.bookings),
                  formatCurrency(category.revenue),
                ])
              : [['No category sales available', '', '']]
          }
        />

        <div className="rounded-[18px] border border-stone-300">
          <div className="border-b border-stone-300 bg-stone-50 px-4 py-3">
            <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-700">
              Busy Month In A Year
            </p>
          </div>
          <div className="space-y-4 p-5">
            <div className="rounded-[18px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
                {reports.busiestMonth.label}
              </p>
              <p className="mt-2 text-3xl font-bold text-stone-950">
                {reports.busiestMonth.bookings}
              </p>
              <p className="mt-1 text-sm text-stone-600">Bookings</p>
            </div>
            <div className="rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-4">
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
                Total Selling
              </p>
              <p className="mt-2 text-2xl font-bold text-stone-950">
                {formatCurrency(reports.busiestMonth.revenue)}
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-2">
        <ComparisonBlock
          title="Current Year vs Previous Year"
          current={reports.yearComparison.current}
          previous={reports.yearComparison.previous}
        />
        <ComparisonBlock
          title="Current Month vs Previous Month"
          current={reports.monthComparison.current}
          previous={reports.monthComparison.previous}
        />
      </section>

      <section className="mt-5">
        <PrintTable
          title="Best Selling Menu Items"
          headings={['Menu Item', 'Category', 'Selections']}
          rows={
            reports.bestSellingMenuItems.length > 0
              ? reports.bestSellingMenuItems.map((item) => [
                  item.name,
                  item.categories.join(', '),
                  String(item.count),
                ])
              : [['No menu item sales available', '', '']]
          }
        />
      </section>

      <footer className="mt-6 border-t border-stone-300 pt-3 text-center text-[11px] font-medium tracking-[0.18em] text-stone-500">
        Copyright by Zenovel Technolab
      </footer>
    </article>
  );
}

function ReportHeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold leading-snug text-stone-950">{value}</p>
    </div>
  );
}

function ComparisonBlock({
  title,
  current,
  previous,
}: {
  title: string;
  current: OrderReports['yearComparison']['current'];
  previous: OrderReports['yearComparison']['previous'];
}) {
  return (
    <div className="rounded-[18px] border border-stone-300">
      <div className="border-b border-stone-300 bg-stone-50 px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-700">
          {title}
        </p>
      </div>
      <div className="grid gap-4 p-4 sm:grid-cols-2">
        {[current, previous].map((entry) => (
          <div
            key={entry.label}
            className="rounded-[18px] border border-stone-200 bg-stone-50 px-4 py-4"
          >
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              {entry.label}
            </p>
            <p className="mt-2 text-2xl font-bold text-stone-950">
              {formatCurrency(entry.revenue)}
            </p>
            <p className="mt-1 text-sm text-stone-600">{entry.bookings} bookings</p>
          </div>
        ))}
      </div>
    </div>
  );
}

function PrintTable({
  title,
  headings,
  rows,
}: {
  title: string;
  headings: string[];
  rows: string[][];
}) {
  return (
    <div className="rounded-[18px] border border-stone-300">
      <div className="border-b border-stone-300 bg-stone-50 px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-700">
          {title}
        </p>
      </div>
      <table className="min-w-full border-collapse text-sm">
        <thead className="bg-stone-100 text-stone-700">
          <tr>
            {headings.map((heading) => (
              <th
                key={heading}
                className="border-b border-stone-300 px-4 py-3 text-left font-semibold"
              >
                {heading}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${title}-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
              {row.map((cell, cellIndex) => (
                <td
                  key={`${title}-${index}-${cellIndex}`}
                  className="border-b border-stone-200 px-4 py-3 align-top text-stone-700"
                >
                  {cell}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

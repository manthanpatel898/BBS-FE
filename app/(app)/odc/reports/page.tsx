'use client';

import { FormEvent, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { PageLoader } from '@/components/ui/page-loader';
import { RoleBasedRestaurantSelector } from '@/components/ui/role-based-restaurant-selector';
import { fetchOdcSummaryReport, fetchRestaurants } from '@/lib/auth/api';
import { OdcOrderStatus, OdcSummaryReport, PaymentStatus, Restaurant } from '@/lib/auth/types';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-cyan-500 focus:ring-2 focus:ring-cyan-100';

const statuses: OdcOrderStatus[] = [
  'INQUIRY',
  'QUOTATION_SENT',
  'FOLLOW_UP',
  'CONFIRMED',
  'COMPLETED',
  'CANCELLED',
];

const paymentStatuses: PaymentStatus[] = ['UNPAID', 'PARTIAL', 'PAID'];

function toDateInputValue(date: Date) {
  return date.toISOString().slice(0, 10);
}

function defaultFromDate() {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth(), 1));
}

function defaultToDate() {
  const now = new Date();
  return toDateInputValue(new Date(now.getFullYear(), now.getMonth() + 1, 0));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string | null | undefined) {
  if (!value) return 'Not set';
  return new Date(value).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function labelize(value: string) {
  return value
    .toLowerCase()
    .split('_')
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(' ');
}

export default function OdcReportsPage() {
  useAppPageHeader({
    eyebrow: 'Outdoor Catering',
    title: 'ODC Reports',
  });

  const { accessToken, user } = useAuth();
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [from, setFrom] = useState(defaultFromDate);
  const [to, setTo] = useState(defaultToDate);
  const [report, setReport] = useState<OdcSummaryReport | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  const isSuperAdmin = user?.role === 'super_admin';
  const hasOdcAccess = Boolean(user?.canAccessOdc);
  const effectiveRestaurantId = isSuperAdmin ? selectedRestaurantId : user?.restaurantId ?? '';

  useEffect(() => {
    if (!accessToken || !isSuperAdmin) return;

    const token = accessToken;
    async function loadRestaurants() {
      try {
        const response = await fetchRestaurants(token, { page: 1, limit: 100, search: '' });
        const odcRestaurants = response.items.filter((restaurant) => restaurant.enableOdc);
        setRestaurants(odcRestaurants);
        setSelectedRestaurantId((current) => current || odcRestaurants[0]?.id || '');
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch restaurants.',
        );
      }
    }

    void loadRestaurants();
  }, [accessToken, isSuperAdmin]);

  useEffect(() => {
    if (!accessToken || !hasOdcAccess || !effectiveRestaurantId) return;
    void loadReport();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, effectiveRestaurantId, hasOdcAccess]);

  async function loadReport() {
    if (!accessToken || !effectiveRestaurantId) return;

    try {
      setIsLoading(true);
      setError('');
      const response = await fetchOdcSummaryReport(accessToken, {
        from,
        to,
        ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
      });
      setReport(response);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to fetch ODC report.',
      );
    } finally {
      setIsLoading(false);
    }
  }

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    void loadReport();
  }

  if (!hasOdcAccess) {
    return (
      <section className="rounded-2xl border border-cyan-100 bg-cyan-50 p-5 text-sm text-cyan-800">
        Outdoor Catering is not enabled for your account.
      </section>
    );
  }

  return (
    <section className="space-y-5">
      <div>
        <p className="text-[10px] font-semibold uppercase tracking-widest text-cyan-600">
          Outdoor Catering
        </p>
        <h1 className="mt-1 text-2xl font-bold text-slate-900">ODC Reports</h1>
        <p className="mt-1 text-sm text-slate-500">
          Review outdoor catering revenue, collections, status mix, and upcoming follow-ups.
        </p>
      </div>

      <form className="grid gap-3 rounded-2xl border border-slate-200 bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_160px_160px_auto] md:items-end" onSubmit={handleSubmit}>
        <RoleBasedRestaurantSelector
          isVisible={isSuperAdmin}
          restaurants={restaurants}
          value={selectedRestaurantId}
          onChange={setSelectedRestaurantId}
        />
        <input value={from} onChange={(event) => setFrom(event.target.value)} type="date" className={inputCls} />
        <input value={to} onChange={(event) => setTo(event.target.value)} type="date" className={inputCls} />
        <button type="submit" disabled={!effectiveRestaurantId || isLoading} className="rounded-xl bg-cyan-600 px-5 py-3 text-sm font-semibold text-white shadow-sm transition hover:bg-cyan-700 disabled:opacity-50">
          Apply
        </button>
      </form>

      {error ? (
        <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      {isLoading ? (
        <PageLoader message="Loading ODC report..." />
      ) : report ? (
        <>
          <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-5">
            {[
              ['Orders', report.totalOrders.toLocaleString('en-IN')],
              ['Pax', report.totalPax.toLocaleString('en-IN')],
              ['Revenue', formatCurrency(report.grandTotal)],
              ['Collected', formatCurrency(report.advanceAmount)],
              ['Pending', formatCurrency(report.pendingAmount)],
            ].map(([label, value]) => (
              <article key={label} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
                <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</p>
                <p className="mt-2 text-2xl font-bold text-slate-900">{value}</p>
              </article>
            ))}
          </div>

          <div className="grid gap-5 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Status Breakdown</h2>
              <div className="mt-4 space-y-2">
                {statuses.map((status) => (
                  <div key={status} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-600">{labelize(status)}</span>
                    <span className="font-semibold text-slate-900">{report.statusCounts[status] ?? 0}</span>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
              <h2 className="text-sm font-semibold text-slate-900">Payment Breakdown</h2>
              <div className="mt-4 space-y-2">
                {paymentStatuses.map((status) => (
                  <div key={status} className="flex items-center justify-between rounded-xl bg-slate-50 px-3 py-2 text-sm">
                    <span className="text-slate-600">{labelize(status)}</span>
                    <span className="font-semibold text-slate-900">{report.paymentStatusCounts[status] ?? 0}</span>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm">
            <h2 className="text-sm font-semibold text-slate-900">Upcoming Follow-ups</h2>
            <div className="mt-4 space-y-3">
              {report.upcomingFollowUps.length === 0 ? (
                <p className="rounded-xl bg-slate-50 p-4 text-sm text-slate-500">No upcoming follow-ups in this range.</p>
              ) : (
                report.upcomingFollowUps.map((followUp) => (
                  <article key={followUp.id} className="rounded-xl border border-slate-100 bg-slate-50 p-3">
                    <div className="flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
                      <div>
                        <p className="font-semibold text-slate-900">{followUp.orderId} · {followUp.customerName}</p>
                        <p className="mt-1 text-xs text-slate-500">{followUp.eventName || 'Outdoor event'} · {followUp.customerPhone}</p>
                      </div>
                      <div className="text-sm text-slate-600">
                        {formatDate(followUp.nextFollowUpDate)}
                      </div>
                    </div>
                  </article>
                ))
              )}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center text-sm text-slate-500 shadow-sm">
          Select an ODC-enabled restaurant and date range to view reports.
        </div>
      )}
    </section>
  );
}

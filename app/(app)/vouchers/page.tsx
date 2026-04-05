'use client';

import { useEffect, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { LoadingButton } from '@/components/ui/loading-button';
import { downloadVoucherFile, fetchVouchers } from '@/lib/auth/api';
import { Order } from '@/lib/auth/types';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

export default function VouchersPage() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!accessToken || !user?.canAccessVoucherFlow) {
      setIsLoading(false);
      return;
    }

    const token = accessToken;

    async function load() {
      try {
        setIsLoading(true);
        setError('');
        const response = await fetchVouchers(token, {
          page,
          limit: 10,
          search,
        });
        setOrders(response.items);
        setTotalPages(response.pagination.totalPages);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to load vouchers.',
        );
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    }

    void load();
  }, [accessToken, page, search, user?.canAccessVoucherFlow]);

  if (!user?.canAccessVoucherFlow) {
    return (
      <BookingsRoute>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          Voucher access is not enabled for this restaurant.
        </div>
      </BookingsRoute>
    );
  }

  return (
    <BookingsRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Vouchers
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Cancellation Vouchers</h1>
            <p className="mt-1 text-sm text-slate-500">
              View all generated cancellation vouchers and download them when needed.
            </p>
          </div>
          <form
            className="flex w-full max-w-xl flex-col gap-2 sm:flex-row"
            onSubmit={(event) => {
              event.preventDefault();
              setIsSearching(true);
              setPage(1);
              setSearch(searchInput.trim());
            }}
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by voucher number, booking id, customer, or phone"
              className={inputCls}
            />
            <LoadingButton
              type="submit"
              isLoading={isSearching && isLoading}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
            >
              Search
            </LoadingButton>
          </form>
        </div>

        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Voucher No</th>
                  <th className="px-5 py-3.5 font-medium">Booking</th>
                  <th className="px-5 py-3.5 font-medium">Customer</th>
                  <th className="px-5 py-3.5 font-medium">Amount</th>
                  <th className="px-5 py-3.5 font-medium">Issued On</th>
                  <th className="px-5 py-3.5 font-medium text-right">Actions</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      Loading vouchers…
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="px-5 py-8 text-center text-slate-500">
                      No vouchers found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="px-5 py-4 font-semibold text-slate-900">
                        {order.voucher?.voucherNumber}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <p className="font-medium text-slate-900">{order.orderId}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {order.eventType || order.functionName || '-'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <p>{fullName(order)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{order.customer.phone}</p>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {formatCurrency(order.voucher?.amount ?? 0)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {order.voucher?.issuedAt ? formatDate(order.voucher.issuedAt) : '-'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          <a
                            href={order.voucher?.voucherUrl || '#'}
                            target="_blank"
                            rel="noreferrer"
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            View
                          </a>
                          <LoadingButton
                            type="button"
                            isLoading={downloadingVoucherId === order.id}
                            onClick={() => {
                              if (!accessToken) return;
                              setDownloadingVoucherId(order.id);
                              void downloadVoucherFile(accessToken, order.id).finally(() =>
                                setDownloadingVoucherId((current) =>
                                  current === order.id ? null : current,
                                ),
                              );
                            }}
                            className="rounded-xl bg-slate-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-slate-800"
                          >
                            Download
                          </LoadingButton>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm">
          <p className="text-slate-500">
            Page {page} of {totalPages}
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((current) => current - 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((current) => current + 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>
      </section>
    </BookingsRoute>
  );
}

function fullName(order: Order) {
  return [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

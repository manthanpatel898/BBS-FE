'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { CommonModal } from '@/components/ui/common-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  addDiningRedemption,
  downloadVoucherFile,
  fetchOrderById,
  fetchOrders,
} from '@/lib/auth/api';
import { Order } from '@/lib/auth/types';

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

type Notice = { type: 'success' | 'error'; message: string } | null;

export default function CancelledBookingsPage() {
  const { accessToken, user } = useAuth();
  const [orders, setOrders] = useState<Order[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [isSearching, setIsSearching] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [redemptionAmount, setRedemptionAmount] = useState('');
  const [redemptionDate, setRedemptionDate] = useState(toDateInputValue(new Date()));
  const [redemptionRemark, setRedemptionRemark] = useState('');
  const [isSubmittingRedemption, setIsSubmittingRedemption] = useState(false);
  const [downloadingVoucherId, setDownloadingVoucherId] = useState<string | null>(null);
  const [openingOrderId, setOpeningOrderId] = useState<string | null>(null);

  useEffect(() => {
    if (!accessToken || !user?.canAccessCancelledBookings) {
      setIsLoading(false);
      return;
    }

    const token = accessToken;

    async function load() {
      try {
        setIsLoading(true);
        const response = await fetchOrders(token, {
          page,
          limit: 10,
          search,
          status: 'CANCELLED',
          hasAdvancePayments: true,
        });
        setOrders(response.items);
        setTotalPages(response.pagination.totalPages);
      } catch (error) {
        setNotice({
          type: 'error',
          message: error instanceof Error ? error.message : 'Unable to fetch cancelled bookings.',
        });
      } finally {
        setIsLoading(false);
        setIsSearching(false);
      }
    }

    void load();
  }, [accessToken, page, search, user?.canAccessCancelledBookings]);

  const ledgerRows = useMemo(() => {
    if (!detailOrder) return [];

    const rows = [
      ...detailOrder.advancePayments.map((payment) => ({
        id: `payment-${payment.id}`,
        date: payment.date,
        type: 'Advance Received',
        amount: payment.amount,
        effect: payment.amount,
        note: `${payment.paymentMode}${payment.remark ? ` • ${payment.remark}` : ''}`,
        recordedByName: payment.recordedByName,
        createdAt: payment.createdAt,
      })),
      ...detailOrder.diningRedemptions.map((entry) => ({
        id: `redemption-${entry.id}`,
        date: entry.date,
        type: 'Dining Used',
        amount: entry.amount,
        effect: -entry.amount,
        note: entry.remark || '-',
        recordedByName: entry.recordedByName,
        createdAt: entry.createdAt,
      })),
    ].sort((a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime());

    let runningBalance = 0;
    return rows.map((row) => {
      runningBalance += row.effect;
      return { ...row, runningBalance };
    });
  }, [detailOrder]);

  if (!user?.canAccessCancelledBookings) {
    return (
      <BookingsRoute>
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-sm text-slate-600 shadow-sm">
          Cancelled bookings feature is not enabled for this restaurant.
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
              Cancelled Bookings
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Cancel Bookings</h1>
            <p className="mt-1 text-sm text-slate-500">
              Track cancelled confirmed bookings with advance received and manage dining deductions.
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
              placeholder="Search by booking id, voucher number, customer, phone, or event"
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

        {notice ? (
          <div
            className={`rounded-xl px-4 py-3 text-sm font-medium ${
              notice.type === 'error'
                ? 'border border-red-200 bg-red-50 text-red-700'
                : 'border border-emerald-200 bg-emerald-50 text-emerald-700'
            }`}
          >
            {notice.message}
          </div>
        ) : null}

        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Booking</th>
                  <th className="px-5 py-3.5 font-medium">Customer</th>
                  <th className="px-5 py-3.5 font-medium">Event</th>
                  <th className="px-5 py-3.5 font-medium">Advance Paid</th>
                  <th className="px-5 py-3.5 font-medium">Voucher</th>
                  <th className="px-5 py-3.5 font-medium">Available Balance</th>
                  <th className="px-5 py-3.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      Loading cancelled bookings…
                    </td>
                  </tr>
                ) : orders.length === 0 ? (
                  <tr>
                    <td colSpan={7} className="px-5 py-8 text-center text-slate-500">
                      No cancelled bookings with advance found.
                    </td>
                  </tr>
                ) : (
                  orders.map((order) => (
                    <tr key={order.id} className="border-t border-slate-100">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{order.orderId}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          Cancelled reason: {order.cancelReason || 'Not provided'}
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <p>{fullName(order)}</p>
                        <p className="mt-0.5 text-xs text-slate-400">{order.customer.phone}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <p>{order.eventType || order.functionName || '-'}</p>
                        <p className="mt-0.5 text-xs text-slate-400">
                          {order.eventDate ? formatDate(order.eventDate) : 'Date pending'}
                        </p>
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {formatCurrency(order.advanceAmount)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        {order.voucher ? (
                          <div className="space-y-1">
                            <p className="font-medium text-slate-900">{order.voucher.voucherNumber}</p>
                            <a
                              href={order.voucher.voucherUrl}
                              target="_blank"
                              rel="noreferrer"
                              className="text-xs text-amber-700 hover:text-amber-800"
                            >
                              View voucher
                            </a>
                          </div>
                        ) : (
                          <span className="text-slate-400">Not generated</span>
                        )}
                      </td>
                      <td className="px-5 py-4 font-medium text-slate-900">
                        {formatCurrency(order.redeemableBalance)}
                      </td>
                      <td className="px-5 py-4 text-right">
                        <LoadingButton
                          type="button"
                          isLoading={openingOrderId === order.id}
                          onClick={() => void openDetail(order.id)}
                          className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          View
                        </LoadingButton>
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

        {isDetailOpen ? (
          <CommonModal
            title={detailOrder ? `Cancelled Booking ${detailOrder.orderId}` : 'Cancelled Booking'}
            description="Booking, customer, advance payment, and dining deduction summary."
            onClose={() => setIsDetailOpen(false)}
            widthClassName="max-w-5xl"
          >
            {isDetailLoading || !detailOrder ? (
              <div className="py-8 text-center text-slate-500">Loading booking details…</div>
            ) : (
              <div className="space-y-6">
                <div className="grid gap-4 lg:grid-cols-2">
                  <InfoCard title="Booking Info">
                    <InfoLine label="Booking Id" value={detailOrder.orderId} />
                    <InfoLine label="Event" value={detailOrder.eventType || detailOrder.functionName || '-'} />
                    <InfoLine label="Function Date" value={detailOrder.eventDate ? formatDate(detailOrder.eventDate) : '-'} />
                    <InfoLine label="Time" value={formatTimeRange(detailOrder.startTime, detailOrder.endTime)} />
                    <InfoLine label="Hall" value={detailOrder.hallDetails || '-'} />
                    <InfoLine label="Cancelled Reason" value={detailOrder.cancelReason || '-'} />
                  </InfoCard>
                  <InfoCard title="Customer Info">
                    <InfoLine label="Customer" value={fullName(detailOrder)} />
                    <InfoLine label="Mobile" value={detailOrder.customer.phone} />
                    <InfoLine label="PAX" value={detailOrder.pax ? String(detailOrder.pax) : '-'} />
                    <InfoLine label="Advance Paid" value={formatCurrency(detailOrder.advanceAmount)} />
                    <InfoLine label="Voucher Number" value={detailOrder.voucher?.voucherNumber || '-'} />
                    <InfoLine label="Dining Used" value={formatCurrency(totalDiningUsed(detailOrder))} />
                    <InfoLine label="Remaining Balance" value={formatCurrency(detailOrder.redeemableBalance)} />
                  </InfoCard>
                </div>

                {detailOrder.voucher ? (
                  <div className="flex flex-wrap gap-3">
                    <a
                      href={detailOrder.voucher.voucherUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                    >
                      View Voucher
                    </a>
                    <LoadingButton
                      type="button"
                      isLoading={downloadingVoucherId === detailOrder.id}
                      onClick={() => {
                        if (!accessToken) return;
                        setDownloadingVoucherId(detailOrder.id);
                        void downloadVoucherFile(accessToken, detailOrder.id).finally(() =>
                          setDownloadingVoucherId((current) =>
                            current === detailOrder.id ? null : current,
                          ),
                        );
                      }}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-slate-800"
                    >
                      Download Voucher
                    </LoadingButton>
                  </div>
                ) : null}

                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                      Treasury Report
                    </p>
                  </div>

                  {user?.role === 'company_admin' ? (
                    <form
                      className="mt-4 grid gap-4 md:grid-cols-[180px_180px_minmax(0,1fr)_auto]"
                      onSubmit={(event) => void handleAddDiningDeduction(event)}
                    >
                      <input
                        type="number"
                        min="1"
                        step="0.01"
                        value={redemptionAmount}
                        onChange={(event) => setRedemptionAmount(event.target.value)}
                        placeholder="Dining bill amount"
                        className={inputCls}
                      />
                      <input
                        type="date"
                        value={redemptionDate}
                        onChange={(event) => setRedemptionDate(event.target.value)}
                        className={inputCls}
                      />
                      <input
                        value={redemptionRemark}
                        onChange={(event) => setRedemptionRemark(event.target.value)}
                        placeholder="Remark (optional)"
                        className={inputCls}
                      />
                      <LoadingButton
                        type="submit"
                        disabled={isSubmittingRedemption}
                        isLoading={isSubmittingRedemption}
                        className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                      >
                        Deduct
                      </LoadingButton>
                    </form>
                  ) : null}

                  <div className="mt-4 overflow-x-auto rounded-2xl border border-amber-100 bg-white">
                    <table className="min-w-full text-left text-sm">
                      <thead className="bg-amber-50 text-slate-500">
                        <tr>
                          <th className="px-4 py-3 font-medium">Date</th>
                          <th className="px-4 py-3 font-medium">Type</th>
                          <th className="px-4 py-3 font-medium">Amount</th>
                          <th className="px-4 py-3 font-medium">Balance</th>
                          <th className="px-4 py-3 font-medium">Note</th>
                          <th className="px-4 py-3 font-medium">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {ledgerRows.length > 0 ? (
                          ledgerRows.map((row) => (
                            <tr key={row.id} className="border-t border-amber-100">
                              <td className="px-4 py-3 text-slate-700">{formatDate(row.date)}</td>
                              <td className="px-4 py-3 text-slate-700">{row.type}</td>
                              <td className={`px-4 py-3 font-medium ${row.effect >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                                {row.effect >= 0 ? '+' : '-'}{formatCurrency(Math.abs(row.amount))}
                              </td>
                              <td className="px-4 py-3 font-medium text-slate-900">
                                {formatCurrency(row.runningBalance)}
                              </td>
                              <td className="px-4 py-3 text-slate-700">{row.note}</td>
                              <td className="px-4 py-3 text-slate-700">{row.recordedByName}</td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                              No treasury entries recorded.
                            </td>
                          </tr>
                        )}
                      </tbody>
                    </table>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Advance Payment Chart
                  </p>
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Amount</th>
                          <th className="px-3 py-2 font-medium">Mode</th>
                          <th className="px-3 py-2 font-medium">Remark</th>
                          <th className="px-3 py-2 font-medium">Recorded By</th>
                        </tr>
                      </thead>
                      <tbody>
                        {detailOrder.advancePayments.map((payment) => (
                          <tr key={payment.id} className="border-b border-slate-100 last:border-b-0">
                            <td className="px-3 py-3 text-slate-700">{formatDate(payment.date)}</td>
                            <td className="px-3 py-3 font-medium text-slate-900">{formatCurrency(payment.amount)}</td>
                            <td className="px-3 py-3 text-slate-700">{payment.paymentMode}</td>
                            <td className="px-3 py-3 text-slate-700">{payment.remark || '-'}</td>
                            <td className="px-3 py-3 text-slate-700">{payment.recordedByName}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              </div>
            )}
          </CommonModal>
        ) : null}
      </section>
    </BookingsRoute>
  );

  async function openDetail(orderId: string) {
    if (!accessToken) return;

    try {
      setOpeningOrderId(orderId);
      setIsDetailOpen(true);
      setIsDetailLoading(true);
      const order = await fetchOrderById(accessToken, orderId);
      setDetailOrder(order);
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to open booking detail.',
      });
      setIsDetailOpen(false);
    } finally {
      setIsDetailLoading(false);
      setOpeningOrderId((current) => (current === orderId ? null : current));
    }
  }

  async function handleAddDiningDeduction(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!accessToken || !detailOrder) return;

    const amount = Number(redemptionAmount);
    if (!amount || amount < 1) {
      setNotice({ type: 'error', message: 'Enter a valid dining bill amount.' });
      return;
    }

    try {
      setIsSubmittingRedemption(true);
      const updated = await addDiningRedemption(accessToken, detailOrder.id, {
        amount,
        date: redemptionDate || undefined,
        remark: redemptionRemark.trim() || undefined,
      });
      setDetailOrder(updated);
      setOrders((current) => current.map((order) => (order.id === updated.id ? updated : order)));
      setRedemptionAmount('');
      setRedemptionRemark('');
      setNotice({ type: 'success', message: 'Dining deduction recorded successfully.' });
    } catch (error) {
      setNotice({
        type: 'error',
        message: error instanceof Error ? error.message : 'Unable to record dining deduction.',
      });
    } finally {
      setIsSubmittingRedemption(false);
    }
  }
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function fullName(order: Order) {
  return [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim();
}

function totalDiningUsed(order: Order) {
  return order.diningRedemptions.reduce((sum, entry) => sum + entry.amount, 0);
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

function formatTimeRange(startTime?: string | null, endTime?: string | null) {
  if (startTime && endTime) {
    return `${formatTime(startTime)} - ${formatTime(endTime)}`;
  }

  if (startTime) return formatTime(startTime);
  if (endTime) return formatTime(endTime);
  return '-';
}

function formatTime(value: string) {
  const [hours, minutes] = value.split(':').map(Number);
  const suffix = hours >= 12 ? 'PM' : 'AM';
  const normalizedHours = hours % 12 || 12;
  return `${String(normalizedHours).padStart(2, '0')}:${String(minutes).padStart(2, '0')} ${suffix}`;
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

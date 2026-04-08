'use client';

import { useMemo, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { LoadingButton } from '@/components/ui/loading-button';
import { addOrderFollowUp, fetchOrderById, fetchOrders } from '@/lib/auth/api';
import { Order, OrderFollowUp, OrderStatus } from '@/lib/auth/types';
import { PageLoader } from '@/components/ui/page-loader';

// ─── Styles ──────────────────────────────────────────────────────────────────

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm font-medium text-slate-900 placeholder:text-slate-500 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

const dateTimeInputCls = `${inputCls} text-slate-900 [color-scheme:light] [--tw-shadow:0_0_0_1000px_white_inset] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-fields-wrapper]:text-slate-900 [&::-webkit-datetime-edit-text]:text-slate-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80`;

const ghostButtonCls =
  'rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 hover:text-slate-900';

const primaryButtonCls =
  'rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60';

// ─── Helpers ─────────────────────────────────────────────────────────────────

function toDateInputValue(value: Date) {
  const y = value.getFullYear();
  const m = String(value.getMonth() + 1).padStart(2, '0');
  const d = String(value.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDateKey(value: string | Date) {
  const date = new Date(value);
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function formatDisplayDate(value: string | Date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  }).format(new Date(value));
}

function formatMonthLabel(value: Date) {
  return new Intl.DateTimeFormat('en-US', { month: 'long', year: 'numeric' }).format(value);
}

function formatFollowUpDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(new Date(value));
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function buildMonthGrid(month: Date) {
  const start = new Date(month.getFullYear(), month.getMonth(), 1);
  const daysInMonth = new Date(month.getFullYear(), month.getMonth() + 1, 0).getDate();
  const leadingEmptyDays = start.getDay();
  const totalCells = Math.ceil((leadingEmptyDays + daysInMonth) / 7) * 7;

  return Array.from({ length: totalCells }, (_, index) => {
    const dayNumber = index - leadingEmptyDays + 1;
    if (dayNumber < 1 || dayNumber > daysInMonth) return null;
    return new Date(month.getFullYear(), month.getMonth(), dayNumber);
  });
}

function statusClasses(status: string) {
  switch (status) {
    case 'INQUIRY':    return 'border-amber-200 bg-amber-50 text-amber-700';
    case 'CONFIRMED':  return 'border-emerald-200 bg-emerald-50 text-emerald-700';
    case 'CANCELLED':  return 'border-red-200 bg-red-50 text-red-700';
    case 'COMPLETED':  return 'border-sky-200 bg-sky-50 text-sky-700';
    default:           return 'border-slate-200 bg-slate-50 text-slate-700';
  }
}

function monthDotClasses(status: OrderStatus) {
  switch (status) {
    case 'CONFIRMED': return 'bg-emerald-500';
    case 'CANCELLED': return 'bg-red-400';
    case 'COMPLETED': return 'bg-sky-500';
    default:          return 'bg-amber-400';
  }
}

function hasFollowUpToday(order: Order, todayKey: string): boolean {
  return order.followUps.some((fu) => formatDateKey(fu.date) === todayKey);
}

function inquiryDotClass(order: Order, todayKey: string): string {
  if (order.status !== 'INQUIRY') return monthDotClasses(order.status);
  return hasFollowUpToday(order, todayKey)
    ? 'bg-emerald-500'   // followed up today → green
    : 'bg-amber-400';    // not yet followed up → amber
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-2">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</span>
      {children}
    </label>
  );
}

function ModalShell({
  eyebrow,
  title,
  children,
  onClose,
  widthClassName = 'max-w-3xl',
  zIndexClassName = 'z-[60]',
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
  onClose: () => void;
  widthClassName?: string;
  zIndexClassName?: string;
}) {
  return (
    <div
      className={`modal-viewport-pad fixed inset-0 ${zIndexClassName} flex items-center justify-center bg-slate-900/50 px-3 backdrop-blur-sm sm:px-4 sm:py-6`}
    >
      <div
        className={`modal-panel-height safe-pad-bottom w-full overflow-y-auto rounded-3xl border border-slate-200 bg-white p-4 shadow-xl sm:rounded-[28px] sm:p-6 ${widthClassName}`}
      >
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">{eyebrow}</p>
            <h2 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{title}</h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close"
            className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
          >
            <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
              <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
            </svg>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function InfoCard({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
      {children}
    </div>
  );
}

// ─── Page ─────────────────────────────────────────────────────────────────────

type ToastState = { type: 'success' | 'error'; message: string };
type FollowUpPopupState = {
  orderId: string;
  orderName: string;
  note: string;
  date: string;
  nextFollowUpDate: string;
};

export default function FollowupsPage() {
  const { accessToken } = useAuth();
  const today = new Date();

  const [currentMonth, setCurrentMonth] = useState(
    new Date(today.getFullYear(), today.getMonth(), 1),
  );

  // dateKey → Order[]
  const [inquiryMap, setInquiryMap] = useState<Record<string, Order[]>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [pageError, setPageError] = useState('');
  const [selectedDay, setSelectedDay] = useState<string | null>(null);

  // Left sidebar (date click)
  const [dayPanel, setDayPanel] = useState<{ dateKey: string; orders: Order[] } | null>(null);

  // Order detail modal (opened from sidebar)
  const [detailOrder, setDetailOrder] = useState<Order | null>(null);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [isDetailLoading, setIsDetailLoading] = useState(false);
  const [detailError, setDetailError] = useState('');

  // Follow up popup (z-[80] so it sits above detail modal z-[60])
  const [followUpPopup, setFollowUpPopup] = useState<FollowUpPopupState | null>(null);
  const [isFollowUpSubmitting, setIsFollowUpSubmitting] = useState(false);

  const [toast, setToast] = useState<ToastState | null>(null);

  const monthGrid = useMemo(() => buildMonthGrid(currentMonth), [currentMonth]);

  useEffect(() => {
    if (!toast) return;
    const id = window.setTimeout(() => setToast(null), 3200);
    return () => window.clearTimeout(id);
  }, [toast]);

  useEffect(() => {
    if (!accessToken) return;
    void loadMonth(accessToken, currentMonth);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, currentMonth]);

  async function loadMonth(token: string, month: Date) {
    const monthStart = new Date(month.getFullYear(), month.getMonth(), 1);
    const monthEnd = new Date(month.getFullYear(), month.getMonth() + 1, 0);
    // from/to filters by eventDate on the backend — show upcoming functions only
    const effectiveFrom = monthStart > today ? monthStart : today;
    try {
      setIsLoading(true);
      setPageError('');
      const response = await fetchOrders(token, {
        page: 1,
        limit: 500,
        search: '',
        status: 'INQUIRY',
        from: toDateInputValue(effectiveFrom),
        to: toDateInputValue(monthEnd),
      });
      const map: Record<string, Order[]> = {};
      for (const order of response.items) {
        // Group by eventDate (function date); fall back to inquiryDate if not set
        const key = order.eventDate
          ? formatDateKey(order.eventDate)
          : order.inquiryDate
            ? formatDateKey(order.inquiryDate)
            : formatDateKey(order.createdAt);
        if (!map[key]) map[key] = [];
        map[key].push(order);
      }
      setInquiryMap(map);
    } catch (err) {
      setPageError(err instanceof Error ? err.message : 'Failed to load follow-ups.');
    } finally {
      setIsLoading(false);
    }
  }

  async function openOrderDetail(orderId: string, initialOrder?: Order) {
    if (!accessToken) return;
    setIsDetailOpen(true);
    setDetailOrder(initialOrder ?? null);
    setIsDetailLoading(true);
    setDetailError('');
    try {
      const order = await fetchOrderById(accessToken, orderId);
      setDetailOrder(order);
    } catch (err) {
      setDetailError(err instanceof Error ? err.message : 'Unable to fetch booking details.');
    } finally {
      setIsDetailLoading(false);
    }
  }

  async function handleAddFollowUp() {
    if (!accessToken || !followUpPopup) return;
    if (!followUpPopup.note.trim()) {
      setToast({ type: 'error', message: 'Follow up note is required.' });
      return;
    }
    try {
      setIsFollowUpSubmitting(true);
      const updatedOrder = await addOrderFollowUp(accessToken, followUpPopup.orderId, {
        note: followUpPopup.note.trim(),
        date: followUpPopup.date || undefined,
        nextFollowUpDate: followUpPopup.nextFollowUpDate || undefined,
      });
      setFollowUpPopup(null);
      setToast({ type: 'success', message: 'Follow up added successfully.' });
      if (isDetailOpen) setDetailOrder(updatedOrder);
      void loadMonth(accessToken, currentMonth);
    } catch (err) {
      setToast({
        type: 'error',
        message: err instanceof Error ? err.message : 'Unable to add follow up.',
      });
    } finally {
      setIsFollowUpSubmitting(false);
    }
  }

  const todayKey = toDateInputValue(today);

  return (
    <section className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-slate-900 sm:text-3xl">Followups</h1>
        <p className="mt-1 text-sm text-slate-500">
          Unconfirmed inquiries by month — click a date to manage follow-ups.
        </p>
      </div>

      {/* Month navigation */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
            Follow Ups
          </p>
          <h2 className="mt-2 text-2xl font-bold text-slate-900">{formatMonthLabel(currentMonth)}</h2>
        </div>
        <div className="flex flex-nowrap items-center gap-2 overflow-x-auto pb-1 md:justify-end">
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() - 1, 1))}
            className={`${ghostButtonCls} shrink-0 whitespace-nowrap`}
          >
            <span className="inline-flex items-center gap-2">
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
                <path d="m12.5 4.5-5 5 5 5" />
              </svg>
              {formatMonthLabel(new Date(currentMonth.getFullYear(), currentMonth.getMonth() - 1, 1))}
            </span>
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth(new Date(today.getFullYear(), today.getMonth(), 1))}
            className={`${ghostButtonCls} shrink-0 whitespace-nowrap`}
          >
            Today
          </button>
          <button
            type="button"
            onClick={() => setCurrentMonth((m) => new Date(m.getFullYear(), m.getMonth() + 1, 1))}
            className={`${ghostButtonCls} shrink-0 whitespace-nowrap`}
          >
            <span className="inline-flex items-center gap-2">
              {formatMonthLabel(new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1))}
              <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.9" className="h-4 w-4">
                <path d="m7.5 4.5 5 5-5 5" />
              </svg>
            </span>
          </button>
        </div>
      </div>

      {/* Calendar */}
      {pageError ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
          <h3 className="text-xl font-semibold text-slate-900">Failed to load</h3>
          <p className="mt-3 text-sm leading-7 text-slate-500">{pageError}</p>
        </div>
      ) : isLoading ? (
        <PageLoader message="Loading follow-ups…" />
      ) : (
        <div className="space-y-4">
          {/* Empty state — no inquiries for the month */}
          {Object.keys(inquiryMap).length === 0 && (
            <div className="flex flex-col items-center justify-center gap-4 rounded-2xl border border-dashed border-slate-200 bg-white py-16 text-center">
              <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-amber-50">
                <svg className="h-8 w-8 text-amber-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.6} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
                  <path d="M13.73 21a2 2 0 0 1-3.46 0" />
                </svg>
              </div>
              <div>
                <h3 className="text-lg font-semibold text-slate-900">All caught up!</h3>
                <p className="mt-2 max-w-xs text-sm leading-6 text-slate-500">
                  No pending inquiries for {formatMonthLabel(currentMonth)}. Check another month or wait for new inquiries to come in.
                </p>
              </div>
            </div>
          )}

          {/* Inquiry date cards — only dates with inquiries, side by side */}
          {Object.keys(inquiryMap).length > 0 && (
            <div className="flex flex-wrap gap-3">
              {Object.entries(inquiryMap)
                .sort(([a], [b]) => a.localeCompare(b))
                .map(([dayKey, dayOrders]) => {
                  const day = new Date(dayKey + 'T00:00:00');
                  const isToday = dayKey === todayKey;
                  const isSelectedDay = selectedDay === dayKey;

                  return (
                    <button
                      key={dayKey}
                      type="button"
                      onClick={() => {
                        setSelectedDay(dayKey);
                        setDayPanel({ dateKey: dayKey, orders: dayOrders });
                      }}
                      className={`w-[calc(50%-6px)] min-h-24 rounded-[20px] border p-2.5 text-left transition sm:w-[calc(33.333%-8px)] md:w-[calc(25%-9px)] lg:w-[calc(20%-10px)] ${
                        isSelectedDay
                          ? 'border-amber-200 bg-amber-50'
                          : 'border-slate-200 bg-white hover:border-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <span
                          className={`inline-flex h-6 w-6 items-center justify-center rounded-full text-sm font-semibold ${
                            isToday ? 'bg-amber-400 text-white' : 'text-slate-900'
                          }`}
                        >
                          {day.getDate()}
                        </span>
                        <span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">
                          {dayOrders.length}
                        </span>
                      </div>
                      <div className="mt-3 flex flex-wrap gap-1.5">
                        {dayOrders.slice(0, 6).map((order) => (
                          <span
                            key={order.id}
                            className={`h-2.5 w-2.5 rounded-full ${inquiryDotClass(order, todayKey)}`}
                          />
                        ))}
                      </div>
                      <div className="mt-3 flex items-center justify-between text-[10px] text-slate-500">
                        <span>
                          {dayOrders.length} inquiry{dayOrders.length > 1 ? 's' : ''}
                        </span>
                      </div>
                    </button>
                  );
                })}
            </div>
          )}
        </div>
      )}

      {/* ── Left sidebar – day panel ─────────────────────────────────────── */}
      {dayPanel ? (
        <>
          <div
            className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm"
            onClick={() => setDayPanel(null)}
          />
          <aside className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xl flex-col border-r border-slate-200 bg-white shadow-2xl">
            {/* Sidebar header */}
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5">
              <div>
                <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
                  Day Inquiries
                </p>
                <h3 className="mt-2 text-2xl font-bold text-slate-900">
                  {formatDisplayDate(dayPanel.dateKey)}
                </h3>
                <p className="mt-1 text-sm text-slate-500">
                  {dayPanel.orders.length} inquiry{dayPanel.orders.length === 1 ? '' : 's'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setDayPanel(null)}
                aria-label="Close day panel"
                className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500 transition hover:bg-slate-50 hover:text-slate-900"
              >
                <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.8" className="h-5 w-5">
                  <path strokeLinecap="round" d="M5 5l10 10M15 5L5 15" />
                </svg>
              </button>
            </div>

            {/* Sidebar body */}
            <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5">
              <div className="space-y-3">
                {dayPanel.orders.length === 0 ? (
                  <div className="rounded-2xl border border-dashed border-slate-200 px-4 py-8 text-center text-sm text-slate-500">
                    No inquiries for this day.
                  </div>
                ) : (
                  dayPanel.orders.map((order) => (
                    <div
                      key={order.id}
                      className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
                    >
                      <div className="flex items-start justify-between gap-3">
                        <div className="min-w-0 flex-1">
                          <p className="text-sm font-semibold text-slate-900">
                            {order.customer.firstName} {order.customer.lastName}
                          </p>
                          {order.functionName ? (
                            <p className="mt-1 text-sm text-slate-600">{order.functionName}</p>
                          ) : null}
                          <p className="mt-1 text-xs text-slate-500">{order.customer.phone}</p>
                          {order.eventDate ? (
                            <p className="mt-1 text-xs text-slate-500">
                              Function: {formatDisplayDate(order.eventDate)}
                            </p>
                          ) : null}
                          {order.startTime && order.endTime ? (
                            <p className="mt-1 text-xs text-slate-500">
                              {order.startTime} – {order.endTime}
                              {order.pax ? ` • ${order.pax} pax` : ''}
                            </p>
                          ) : null}
                          {order.serviceSlot ? (
                            <p className="mt-1 text-xs font-semibold text-slate-900">
                              Service Slot: {order.serviceSlot}
                            </p>
                          ) : null}
                          {order.hallDetails ? (
                            <p className="mt-1 text-xs font-semibold text-slate-900">
                              Hall: {order.hallDetails}
                            </p>
                          ) : null}
                        </div>
                        <div className="flex shrink-0 flex-col items-end gap-2 text-right">
                          <span
                            className={`inline-flex rounded-full border px-3 py-1 text-xs font-medium uppercase tracking-[0.12em] ${statusClasses(order.status)}`}
                          >
                            {order.status}
                          </span>
                          <a
                            href={`tel:${order.customer.phone}`}
                            onClick={(e) => e.stopPropagation()}
                            className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 transition hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"
                            title="Call"
                            aria-label={`Call ${order.customer.firstName} ${order.customer.lastName}`}
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4">
                              <path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 16.352V17.5a1.5 1.5 0 01-1.5 1.5H15c-1.149 0-2.263-.15-3.326-.43A13.022 13.022 0 012.43 8.326 13.019 13.019 0 012 5V3.5z" clipRule="evenodd" />
                            </svg>
                          </a>
                        </div>
                      </div>

                      {/* Action buttons */}
                      <div className="mt-4 flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={() => {
                            setDayPanel(null);
                            void openOrderDetail(order.id, order);
                          }}
                          title="View booking"
                          aria-label="View booking"
                          className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600 transition hover:bg-slate-50"
                        >
                          <svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4">
                            <path d="M1.5 10s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z" />
                            <circle cx="10" cy="10" r="2.5" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setFollowUpPopup({
                              orderId: order.id,
                              orderName: `${order.customer.firstName} ${order.customer.lastName}`.trim(),
                              note: '',
                              date: toDateInputValue(new Date()),
                              nextFollowUpDate: '',
                            })
                          }
                          className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                        >
                          Follow ups
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </aside>
        </>
      ) : null}

      {/* ── Order detail modal ───────────────────────────────────────────── */}
      {isDetailOpen ? (
        <ModalShell
          eyebrow="Order Detail"
          title={detailOrder?.orderId || 'Booking details'}
          onClose={() => {
            setIsDetailOpen(false);
            setDetailOrder(null);
            setDetailError('');
          }}
          widthClassName="max-w-4xl"
          zIndexClassName="z-[60]"
        >
          {isDetailLoading && !detailOrder ? (
            <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-10 text-center text-slate-400">
              Loading booking details…
            </div>
          ) : detailError ? (
            <div className="mt-6 rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-6 py-10 text-center">
              <h3 className="text-xl font-semibold text-slate-900">Unable to open booking</h3>
              <p className="mt-3 text-sm text-slate-500">{detailError}</p>
            </div>
          ) : detailOrder ? (
            <div className="mt-6 space-y-6">
              <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                <InfoCard label="Customer">
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {detailOrder.customer.firstName} {detailOrder.customer.lastName}
                  </p>
                  <p className="mt-2 text-slate-700">{detailOrder.customer.phone}</p>
                  {detailOrder.customer.email ? (
                    <p className="mt-1 text-slate-500">{detailOrder.customer.email}</p>
                  ) : null}
                </InfoCard>
                <InfoCard label="Inquiry Details">
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {detailOrder.functionName || 'Details pending'}
                  </p>
                  <p className="mt-2 text-slate-700">
                    {detailOrder.eventDate ? formatDisplayDate(detailOrder.eventDate) : 'Date pending'}
                  </p>
                  <p className="mt-1 text-slate-500">
                    {detailOrder.startTime && detailOrder.endTime
                      ? `${detailOrder.startTime} – ${detailOrder.endTime}`
                      : 'Time pending'}
                  </p>
                  {detailOrder.serviceSlot ? (
                    <p className="mt-1 text-slate-500">{detailOrder.serviceSlot}</p>
                  ) : null}
                  {detailOrder.referenceBy ? (
                    <p className="mt-1 text-slate-500">Reference: {detailOrder.referenceBy}</p>
                  ) : null}
                </InfoCard>
                <InfoCard label="Package">
                  <p className="mt-2 text-lg font-semibold text-slate-900">
                    {detailOrder.categorySnapshot?.name || 'Package pending'}
                  </p>
                  <p className="mt-2 text-slate-700">
                    {detailOrder.pax ?? 0} guests at {formatCurrency(detailOrder.pricePerPlate)} per plate
                  </p>
                </InfoCard>
                <InfoCard label="Status">
                  <span
                    className={`mt-3 inline-flex rounded-full border px-3 py-1 text-xs font-medium ${statusClasses(detailOrder.status)}`}
                  >
                    {detailOrder.status}
                  </span>
                  <p className="mt-3 text-slate-500">Order #{detailOrder.orderNumber}</p>
                  <p className="mt-1 text-slate-500">
                    Inquiry:{' '}
                    {detailOrder.inquiryDate ? formatDisplayDate(detailOrder.inquiryDate) : '—'}
                  </p>
                </InfoCard>
              </div>

              {/* Follow Ups */}
              <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                <div className="flex items-center justify-between gap-3">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Follow Ups
                  </p>
                  <button
                    type="button"
                    onClick={() =>
                      setFollowUpPopup({
                        orderId: detailOrder.id,
                        orderName:
                          `${detailOrder.customer.firstName} ${detailOrder.customer.lastName}`.trim(),
                        note: '',
                        date: toDateInputValue(new Date()),
                        nextFollowUpDate: '',
                      })
                    }
                    className={ghostButtonCls}
                  >
                    Add follow up
                  </button>
                </div>
                {detailOrder.followUps.length === 0 ? (
                  <p className="mt-4 text-sm text-slate-500">No follow ups added yet.</p>
                ) : (
                  <div className="mt-4 overflow-x-auto">
                    <table className="min-w-full text-left text-sm">
                      <thead>
                        <tr className="border-b border-slate-200 text-slate-500">
                          <th className="px-3 py-2 font-medium">Follow Up By</th>
                          <th className="px-3 py-2 font-medium">Date</th>
                          <th className="px-3 py-2 font-medium">Next Follow Up</th>
                          <th className="px-3 py-2 font-medium">Note</th>
                        </tr>
                      </thead>
                      <tbody>
                        {[...detailOrder.followUps]
                          .sort(
                            (a: OrderFollowUp, b: OrderFollowUp) =>
                              new Date(b.date).getTime() - new Date(a.date).getTime(),
                          )
                          .map((fu: OrderFollowUp, i: number) => (
                            <tr
                              key={`${fu.createdAt}-${i}`}
                              className="border-b border-slate-100 last:border-b-0"
                            >
                              <td className="px-3 py-3 text-slate-700">{fu.followUpByName}</td>
                              <td className="px-3 py-3 text-slate-700">{formatFollowUpDate(fu.date)}</td>
                              <td className="px-3 py-3 text-slate-700">{fu.nextFollowUpDate ? formatFollowUpDate(fu.nextFollowUpDate) : '-'}</td>
                              <td className="px-3 py-3 text-slate-700">{fu.note}</td>
                            </tr>
                          ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>

              {detailOrder.additionalInformation ? (
                <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Additional Information
                  </p>
                  <p className="mt-4 text-sm leading-7 text-slate-700">
                    {detailOrder.additionalInformation}
                  </p>
                </div>
              ) : null}
            </div>
          ) : null}
        </ModalShell>
      ) : null}

      {/* ── Follow up popup (above everything) ──────────────────────────── */}
      {followUpPopup ? (
        <ModalShell
          eyebrow="Follow Ups"
          title="Add follow up"
          onClose={() => setFollowUpPopup(null)}
          widthClassName="max-w-3xl"
          zIndexClassName="z-[80]"
        >
          <div className="mt-6 space-y-5">
            <div className="rounded-[26px] border border-slate-200 bg-slate-50 px-5 py-4">
              <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Customer</p>
              <p className="mt-2 text-lg font-semibold text-slate-900">{followUpPopup.orderName}</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Date">
                <input
                  type="date"
                  value={followUpPopup.date}
                  onChange={(e) =>
                    setFollowUpPopup((c) => (c ? { ...c, date: e.target.value } : c))
                  }
                  className={`${dateTimeInputCls} min-h-12`}
                />
              </Field>
              <Field label="Next Follow Up Date">
                <input
                  type="date"
                  value={followUpPopup.nextFollowUpDate}
                  onChange={(e) =>
                    setFollowUpPopup((c) => (c ? { ...c, nextFollowUpDate: e.target.value } : c))
                  }
                  className={`${dateTimeInputCls} min-h-12`}
                />
              </Field>
            </div>
            <Field label="Note">
              <textarea
                value={followUpPopup.note}
                onChange={(e) =>
                  setFollowUpPopup((c) => (c ? { ...c, note: e.target.value } : c))
                }
                placeholder="Add follow up note"
                className={`${inputCls} min-h-32 resize-none`}
              />
            </Field>
            <div className="rounded-2xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
              Set the next follow up date to keep today’s dashboard follow up list accurate.
            </div>
            <div className="grid gap-3 sm:grid-cols-2">
              <button
                type="button"
                onClick={() => setFollowUpPopup(null)}
                className="w-full rounded-2xl border border-slate-200 px-4 py-3 text-sm font-semibold text-slate-600 transition hover:bg-slate-50"
              >
                Cancel
              </button>
              <LoadingButton
                type="button"
                onClick={() => void handleAddFollowUp()}
                disabled={isFollowUpSubmitting}
                isLoading={isFollowUpSubmitting}
                className="w-full rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
              >
                Save follow up
              </LoadingButton>
            </div>
          </div>
        </ModalShell>
      ) : null}

      {/* Toast */}
      {toast ? (
        <div
          className={`fixed right-4 top-20 z-70 max-w-md rounded-xl border px-4 py-3 text-sm font-medium shadow-lg sm:right-6 ${
            toast.type === 'success'
              ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
              : 'border-red-200 bg-red-50 text-red-700'
          }`}
        >
          {toast.message}
        </div>
      ) : null}
    </section>
  );
}

'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchOrderPrint, fetchRestaurantById, fetchSettings } from '@/lib/auth/api';
import { AppSettings, Order, Restaurant } from '@/lib/auth/types';

type CopyType = 'company' | 'manager' | 'customer';

type MenuRow = {
  key: string;
  section: string;
  item: string;
  showSection: boolean;
};

export function PrintOrderView({
  orderId,
  copyType,
}: {
  orderId?: string;
  copyType?: string;
}) {
  const { accessToken } = useAuth();
  const [order, setOrder] = useState<Order | null>(null);
  const [restaurant, setRestaurant] = useState<Restaurant | null>(null);
  const [settings, setSettings] = useState<AppSettings | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');

  const resolvedCopyType: CopyType = useMemo(() => {
    if (copyType === 'manager' || copyType === 'customer') {
      return copyType;
    }

    return 'company';
  }, [copyType]);

  useEffect(() => {
    if (!accessToken || !orderId) {
      setIsLoading(false);
      setError(orderId ? 'Missing session token.' : 'Missing order id.');
      return;
    }

    const token = accessToken;
    const requestedOrderId = orderId;

    async function loadOrder() {
      try {
        setIsLoading(true);
        setError('');
        const response = await fetchOrderPrint(token, requestedOrderId);
        setOrder(response);
        try {
          const settingsResponse = await fetchSettings(token);
          setSettings(settingsResponse);
        } catch {
          setSettings(null);
        }

        if (response.restaurantId) {
          try {
            const restaurantResponse = await fetchRestaurantById(
              token,
              response.restaurantId,
            );
            setRestaurant(restaurantResponse);
          } catch {
            setRestaurant(null);
          }
        } else {
          setRestaurant(null);
        }
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load print view.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadOrder();
  }, [accessToken, orderId]);

  return (
    <BookingsRoute>
      <section className="min-h-screen bg-stone-100 px-4 py-8 text-stone-900 print:bg-white print:px-0 print:py-0">
        <div className="mx-auto max-w-[220mm] space-y-6">
          <div className="flex flex-col gap-4 rounded-[28px] bg-white p-6 shadow-sm print:hidden md:flex-row md:items-center md:justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.35em] text-amber-600">
                Print View
              </p>
              <h1 className="mt-2 text-3xl font-semibold">
                Booking Summary
              </h1>
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
              Loading printable order...
            </div>
          ) : error ? (
            <div className="rounded-[28px] bg-white p-10 text-center text-red-600 shadow-sm">
              {error}
            </div>
          ) : order ? (
            order.status !== 'CONFIRMED' ? (
              <div className="rounded-[28px] bg-white p-10 text-center text-red-600 shadow-sm">
                Print copies are available only for confirmed bookings.
              </div>
            ) : (
              <PrintDocument
                order={order}
                restaurant={restaurant}
                settings={settings}
                copyType={resolvedCopyType}
              />
            )
          ) : null}
        </div>
      </section>
    </BookingsRoute>
  );
}

function PrintDocument({
  order,
  restaurant,
  settings,
  copyType,
}: {
  order: Order;
  restaurant: Restaurant | null;
  settings: AppSettings | null;
  copyType: CopyType;
}) {
  const menuRows = buildMenuRows(order);
  const advanceRows = [...order.advancePayments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const banquetRules = settings?.banquetRules ?? [];

  return (
    <article className="mx-auto max-w-[210mm] bg-white px-[7mm] py-[6mm] text-stone-900 shadow-sm print:max-w-none print:px-[4mm] print:py-[3mm] print:text-[11px] print:shadow-none">
      <header className="border-b border-stone-300 pb-2">
        <h1 className="text-lg font-bold uppercase tracking-[0.28em] text-stone-950 print:text-base">
          Booking Summary
        </h1>
      </header>

      <section className="mt-3 grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2">
        <CompactTable
          title="Event Details"
          rows={[
            ['Function Date and Time', formatEventDateTime(order)],
            ['Slot Type', order.serviceSlot || 'Pending'],
            ['Event Type', order.eventType || order.functionName || 'Pending'],
            ['Hall NO', order.hallDetails || 'Pending'],
            ['Customer Name', fullName(order)],
            ['Customer Number', order.customer.phone],
            ['Pax', order.pax ? `${order.pax} Person` : 'Pending'],
            [
              'Menu Category with Price',
              order.categorySnapshot
                ? `${order.categorySnapshot.name} (${formatCurrency(order.pricePerPlate)})`
                : 'Pending',
            ],
          ]}
        />
        <CompactTable
          title="Inquiry Notes"
          rows={[
            [
              'Jain/Swaminarayan Person Info',
              order.jainSwaminarayanPax ? `${order.jainSwaminarayanPax} Person` : 'N/A',
            ],
            ['Jain/Swaminarayan Details', order.jainSwaminarayanDetails || 'N/A'],
            ['Seating Required', order.seatingRequired ? String(order.seatingRequired) : 'N/A'],
            ['Additional Information', order.additionalInformation || order.notes || 'N/A'],
            ['Reference By', order.referenceBy || 'N/A'],
            ['Booked By', order.bookingTakenBy || 'N/A'],
          ]}
        />
      </section>

      <section className="mt-3 rounded-[14px] border border-stone-300 print:mt-2">
        <div className="border-b border-stone-300 bg-stone-50 px-3 py-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-700">
            Selected Menu Snapshot
          </p>
        </div>
        <table className="min-w-full border-collapse text-[11px] print:text-[10px]">
          <thead className="bg-stone-100 text-stone-700">
            <tr>
              <th className="border-b border-stone-300 px-3 py-2 text-left font-semibold">
                Section
              </th>
              <th className="border-b border-stone-300 px-3 py-2 text-left font-semibold">
                Selected Items
              </th>
            </tr>
          </thead>
          <tbody>
            {menuRows.length > 0 ? (
              menuRows.map((row, index) => (
                <tr key={row.key} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                  <td className="border-b border-stone-200 px-3 py-1.5 align-top font-semibold text-stone-900">
                    {row.showSection ? row.section : ''}
                  </td>
                  <td className="border-b border-stone-200 px-3 py-1.5 text-stone-700">
                    {row.item}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-4 text-center text-xs text-stone-500"
                >
                  Menu selection pending
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className="mt-3 rounded-[14px] border border-stone-300 print:mt-2">
        <div className="border-b border-stone-300 bg-stone-50 px-3 py-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-700">
            Financial Summary
          </p>
        </div>
        <div className="px-3 py-2.5 print:px-2 print:py-2">
          <div className="rounded-[12px] border border-stone-200">
            <div className="border-b border-stone-200 bg-stone-50 px-3 py-1.5 text-xs font-semibold uppercase tracking-[0.24em] text-stone-700">
              Advance Entries
            </div>
            <table className="min-w-full border-collapse text-[11px] print:text-[10px]">
              <thead className="bg-stone-100 text-stone-700">
                <tr>
                  <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold">Date</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold">Mode</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold">Amount</th>
                  <th className="border-b border-stone-200 px-3 py-2 text-left font-semibold">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {advanceRows.length > 0 ? (
                  advanceRows.map((payment, index) => (
                    <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                      <td className="border-b border-stone-200 px-3 py-1.5">{formatDateTime(payment.date)}</td>
                      <td className="border-b border-stone-200 px-3 py-1.5">{payment.paymentMode}</td>
                      <td className="border-b border-stone-200 px-3 py-1.5">{formatCurrency(payment.amount)}</td>
                      <td className="border-b border-stone-200 px-3 py-1.5">{payment.remark || '-'}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center text-stone-500">
                      No advance entries recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className="mt-4 pt-4 print:mt-3 print:pt-3">
        <p className="text-[11px] font-medium text-stone-700 print:text-[10px]">
          I agree to all banquet rules and confirm that I have read and understood them.
        </p>
      </section>

      <section className="mt-4 grid gap-6 pt-4 md:grid-cols-2 print:mt-3 print:grid-cols-2 print:gap-4 print:pt-3">
        <SignatureBox label="Customer Sign" />
        <SignatureBox label="Manager Sign" />
      </section>

      <section className="mt-3 rounded-[14px] border border-stone-300 print:mt-2 print:break-before-page">
        <div className="border-b border-stone-300 bg-stone-50 px-3 py-1.5">
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-700">
            Banquet Rules
          </p>
        </div>
        <div className="px-3 py-2.5 print:px-2 print:py-2">
          {banquetRules.length > 0 ? (
            <ol className="space-y-1 pl-5 text-[11px] text-stone-700 print:text-[10px]">
              {banquetRules.map((rule) => (
                <li key={rule.id}>{rule.label}</li>
              ))}
            </ol>
          ) : (
            <p className="text-[11px] text-stone-500 print:text-[10px]">
              No banquet rules configured.
            </p>
          )}
        </div>
      </section>

      <div className="hidden print:fixed print:bottom-[3mm] print:right-[5mm] print:block print:text-[10px] print:font-medium print:text-stone-500">
        Page 1
      </div>
    </article>
  );
}

function CompactTable({
  title,
  rows,
  compact = false,
}: {
  title: string;
  rows: Array<[string, string]>;
  compact?: boolean;
}) {
  return (
    <section className="rounded-[14px] border border-stone-300">
      <div className="border-b border-stone-300 bg-stone-50 px-3 py-2 print:px-2 print:py-1.5">
        <p className="text-xs font-semibold uppercase tracking-[0.24em] text-stone-700">
          {title}
        </p>
      </div>
      <div className="divide-y divide-stone-200">
        {rows.map(([label, value]) => {
          return (
            <div
              key={`${title}-${label}`}
              className={`grid gap-3 px-3 print:gap-2 print:px-2 ${compact ? 'grid-cols-[130px_minmax(0,1fr)] py-1.5 text-[11px] print:grid-cols-[110px_minmax(0,1fr)] print:py-1 print:text-[10px]' : 'grid-cols-[145px_minmax(0,1fr)] py-2 text-[11px] print:grid-cols-[118px_minmax(0,1fr)] print:py-1 print:text-[10px]'}`}
            >
              <span className="font-medium text-stone-500">{label}</span>
              <span className="font-semibold text-stone-900">{value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SignatureBox({ label }: { label: string }) {
  return (
    <div className="rounded-[12px] border border-stone-300 px-4 pb-3 pt-6 print:px-3 print:pb-2 print:pt-5">
      <div className="h-8 border-b border-stone-500 print:h-7" />
      <p className="mt-2 text-center text-xs font-semibold uppercase tracking-[0.2em] text-stone-600">
        {label}
      </p>
    </div>
  );
}

function buildMenuRows(order: Order): MenuRow[] {
  return order.menuSelectionSnapshot.flatMap((menu) =>
    menu.sections.flatMap((section) =>
      section.items.map((item, index) => ({
        key: `${menu.menuId}-${section.sectionTitle}-${index}-${item}`,
        section: `${section.sectionTitle} - ${section.items.length}`,
        item,
        showSection: index === 0,
      })),
    ),
  );
}

function fullName(order: Order) {
  return [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim();
}

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(value);
}

function formatLongDate(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(new Date(value));
}

function formatDateTime(value: string) {
  return new Intl.DateTimeFormat('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function formatEventDateTime(order: Order) {
  const date = order.eventDate ? formatLongDate(order.eventDate) : 'Pending';
  const time =
    order.startTime && order.endTime
      ? `${formatTime12Hour(order.startTime)} - ${formatTime12Hour(order.endTime)}`
      : order.startTime
        ? formatTime12Hour(order.startTime)
        : order.endTime
          ? formatTime12Hour(order.endTime)
          : 'Time pending';

  return `${date} | ${time}`;
}

function formatTime12Hour(value: string) {
  const [hourPart, minutePart] = value.split(':').map(Number);
  const suffix = hourPart >= 12 ? 'PM' : 'AM';
  const hour = hourPart % 12 || 12;

  return `${String(hour).padStart(2, '0')}:${String(minutePart).padStart(2, '0')} ${suffix}`;
}

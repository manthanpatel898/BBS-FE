'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchOrderPrint, fetchRestaurantById } from '@/lib/auth/api';
import { Order, Restaurant } from '@/lib/auth/types';

type CopyType = 'company' | 'manager' | 'customer';

type MenuRow = {
  key: string;
  category: string;
  selectedMenu: string;
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
                {copyTitle(resolvedCopyType)}
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
  copyType,
}: {
  order: Order;
  restaurant: Restaurant | null;
  copyType: CopyType;
}) {
  const menuRows = buildMenuRows(order);

  return (
    <article className="mx-auto min-h-[297mm] max-w-[210mm] bg-white px-[12mm] py-[10mm] text-stone-900 shadow-sm print:min-h-0 print:max-w-none print:px-[8mm] print:py-[8mm] print:shadow-none">
      <header className="border-b border-stone-300 pb-5">
        <div className="flex items-start justify-between gap-6">
          <div className="min-w-0">
            <p className="text-[11px] font-semibold uppercase tracking-[0.4em] text-amber-700">
              {copyTitle(copyType)}
            </p>
            <h1 className="mt-2 text-[28px] font-bold leading-tight text-stone-950">
              {restaurant?.name || 'Banquate Booking System'}
            </h1>
            <p className="mt-1 text-sm text-stone-600">
              {restaurant?.address || 'Professional booking and banquet summary'}
            </p>
          </div>
          <div className="min-w-[190px] rounded-[20px] border border-stone-300 bg-stone-50 px-4 py-3 text-right">
            <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Booking ID
            </p>
            <p className="mt-1 text-xl font-bold text-stone-950">{order.orderId}</p>
            <p className="mt-3 text-[11px] font-semibold uppercase tracking-[0.28em] text-stone-500">
              Status
            </p>
            <p className="mt-1 text-sm font-semibold text-stone-900">{order.status}</p>
          </div>
        </div>
      </header>

      <section className="mt-5 grid gap-3 md:grid-cols-4">
        <HeroStat label="Event Date" value={order.eventDate ? formatLongDate(order.eventDate) : 'Pending'} />
        <HeroStat label="Event Name" value={order.functionName || 'Pending'} />
        <HeroStat label="Hall Details" value={order.hallDetails || 'Pending'} />
        <HeroStat label="Guest No" value={order.pax ? String(order.pax) : 'Pending'} />
      </section>

      <section className="mt-5 grid gap-4 md:grid-cols-[1.1fr_0.9fr]">
        <DataTable
          title="Inquiry Details"
          rows={[
            ['Customer Name', fullName(order)],
            ['Mobile Number', order.customer.phone],
            ['Service Slot', order.serviceSlot || 'Pending'],
            ['Event Type', order.eventType || order.functionName || 'Pending'],
            ['Start Time', order.startTime || 'Pending'],
            ['End Time', order.endTime || 'Pending'],
            ['Booking Taken By', order.bookingTakenBy || 'N/A'],
            ['Reference By', order.referenceBy || 'N/A'],
          ]}
        />
        <DataTable
          title="Booking Summary"
          rows={[
            ['Category', order.categorySnapshot?.name || 'Pending'],
            ['Price Per Plate', formatCurrency(order.pricePerPlate)],
            ['Advance Amount', formatCurrency(order.advanceAmount)],
            ['Pending Amount', formatCurrency(order.pendingAmount)],
            ['Payment Mode', order.paymentMode || 'Pending'],
            ['Created On', formatLongDate(order.createdAt)],
            ['Additional Info', order.additionalInformation || 'N/A'],
          ]}
        />
      </section>

      <section className="mt-5 rounded-[18px] border border-stone-300">
        <div className="border-b border-stone-300 bg-stone-50 px-4 py-3">
          <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-700">
            Selected Menu With Category
          </p>
        </div>
        <table className="min-w-full border-collapse text-sm">
          <thead className="bg-stone-100 text-stone-700">
            <tr>
              <th className="border-b border-stone-300 px-4 py-3 text-left font-semibold">
                Category
              </th>
              <th className="border-b border-stone-300 px-4 py-3 text-left font-semibold">
                Selected Menu
              </th>
            </tr>
          </thead>
          <tbody>
            {menuRows.length > 0 ? (
              menuRows.map((row, index) => (
                <tr key={row.key} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                  <td className="border-b border-stone-200 px-4 py-3 align-top font-semibold text-stone-900">
                    {row.category}
                  </td>
                  <td className="border-b border-stone-200 px-4 py-3 text-stone-700">
                    {row.selectedMenu}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={2}
                  className="px-4 py-5 text-center text-sm text-stone-500"
                >
                  Menu selection pending
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </section>

      <section className={`mt-5 grid gap-4 ${copyType === 'company' ? 'md:grid-cols-[1.1fr_0.9fr]' : 'md:grid-cols-2'}`}>
        <DataTable
          title="Guest Notes"
          rows={[
            ['Jain/Swaminarayan Pax', order.jainSwaminarayanPax ? String(order.jainSwaminarayanPax) : 'N/A'],
            ['Jain/Swaminarayan Details', order.jainSwaminarayanDetails || 'N/A'],
            ['Seating Required', order.seatingRequired ? String(order.seatingRequired) : 'N/A'],
            ['Notes', order.notes || 'N/A'],
          ]}
        />
        {copyType === 'company' ? (
          <DataTable
            title="Financial Summary"
            rows={[
              ['Base Total', formatCurrency(order.baseTotal)],
              ['Extras Total', formatCurrency(order.extrasTotal)],
              ['Discount', formatCurrency(order.discountAmount)],
              ['Grand Total', formatCurrency(order.grandTotal)],
              ['Advance Amount', formatCurrency(order.advanceAmount)],
              ['Pending Amount', formatCurrency(order.pendingAmount)],
            ]}
            emphasizedRows={['Grand Total', 'Pending Amount']}
          />
        ) : copyType === 'customer' ? (
          <DataTable
            title="Payment Summary"
            rows={[
              ['Category', order.categorySnapshot?.name || 'Pending'],
              ['Grand Total', formatCurrency(order.grandTotal)],
              ['Advance Amount', formatCurrency(order.advanceAmount)],
              ['Pending Amount', formatCurrency(order.pendingAmount)],
              ['Payment Mode', order.paymentMode || 'Pending'],
            ]}
            emphasizedRows={['Grand Total', 'Pending Amount']}
          />
        ) : (
          <DataTable
            title="Operational Summary"
            rows={[
              ['Category', order.categorySnapshot?.name || 'Pending'],
              ['Price Per Plate', formatCurrency(order.pricePerPlate)],
              ['Grand Total', formatCurrency(order.grandTotal)],
              ['Booking Taken By', order.bookingTakenBy || 'N/A'],
              ['Reference By', order.referenceBy || 'N/A'],
            ]}
            emphasizedRows={['Grand Total']}
          />
        )}
      </section>

      <footer className="mt-6 border-t border-stone-300 pt-3 text-center text-[11px] font-medium tracking-[0.18em] text-stone-500">
        Copyright by Zenovel Technolab
      </footer>
    </article>
  );
}

function HeroStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18px] border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 px-4 py-4">
      <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-amber-700">
        {label}
      </p>
      <p className="mt-2 text-lg font-bold leading-snug text-stone-950">{value}</p>
    </div>
  );
}

function DataTable({
  title,
  rows,
  emphasizedRows = [],
}: {
  title: string;
  rows: Array<[string, string]>;
  emphasizedRows?: string[];
}) {
  return (
    <section className="rounded-[18px] border border-stone-300">
      <div className="border-b border-stone-300 bg-stone-50 px-4 py-3">
        <p className="text-sm font-semibold uppercase tracking-[0.28em] text-stone-700">
          {title}
        </p>
      </div>
      <div className="divide-y divide-stone-200">
        {rows.map(([label, value]) => {
          const emphasized = emphasizedRows.includes(label);
          return (
            <div
              key={`${title}-${label}`}
              className="grid grid-cols-[170px_minmax(0,1fr)] gap-4 px-4 py-3 text-sm"
            >
              <span className="font-medium text-stone-500">{label}</span>
              <span className={emphasized ? 'font-bold text-stone-950' : 'font-semibold text-stone-900'}>
                {value}
              </span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function buildMenuRows(order: Order): MenuRow[] {
  return order.menuSelectionSnapshot.flatMap((menu) =>
    menu.sections.map((section) => ({
      key: `${menu.menuId}-${section.sectionTitle}`,
      category: section.sectionTitle,
      selectedMenu: section.items.join(', '),
    })),
  );
}

function fullName(order: Order) {
  return [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ').trim();
}

function copyTitle(copyType: CopyType) {
  switch (copyType) {
    case 'manager':
      return 'Manager Copy';
    case 'customer':
      return 'Customer Copy';
    default:
      return 'Company Copy';
  }
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

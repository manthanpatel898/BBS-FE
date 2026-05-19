'use client';

import { useEffect, useMemo, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { fetchMyRestaurant, fetchOrderPrint, fetchRestaurantById, fetchSettings } from '@/lib/auth/api';
import { AppSettings, Order, Restaurant } from '@/lib/auth/types';

type CopyType = 'company' | 'manager' | 'customer' | 'kitchen';

type MenuRow = {
  key: string;
  section: string;
  item: string;
  showSection: boolean;
};

type MenuSectionBox = {
  key: string;
  section: string;
  items: string[];
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
    if (
      copyType === 'manager' ||
      copyType === 'customer' ||
      copyType === 'kitchen'
    ) {
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

        try {
          const myRestaurant = await fetchMyRestaurant(token);
          setRestaurant(myRestaurant);
        } catch {
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
  const menuSectionRows = buildMenuSectionRows(order, 3);
  const advanceRows = [...order.advancePayments].sort(
    (a, b) => new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime(),
  );
  const banquetRules = settings?.banquetRules ?? [];
  const isKitchenCopy = copyType === 'kitchen';
  const addonServicesSummary =
    order.addonServiceSnapshots.length > 0
      ? order.addonServiceSnapshots
          .map((item) => `${item.label} (${formatCurrency(item.price)})`)
          .join(', ')
      : 'N/A';
  const addonServicesTotal = order.addonServiceSnapshots.reduce(
    (sum, item) => sum + item.price,
    0,
  );
  const restaurantContacts =
    restaurant?.contactNumbers?.filter(Boolean).length
      ? restaurant.contactNumbers.filter(Boolean)
      : restaurant?.contactPersonNumber
        ? [restaurant.contactPersonNumber]
        : [];

  return (
    <article
      className={`mx-auto max-w-[210mm] bg-white text-stone-950 shadow-sm print:max-w-none print:shadow-none ${
        isKitchenCopy
          ? 'px-[5mm] py-[4mm] text-[12px] font-semibold print:px-[3mm] print:py-[2mm] print:text-[12px]'
          : 'px-[7mm] py-[6mm] text-stone-900 print:px-[4mm] print:pb-[16mm] print:pt-[3mm] print:text-[11px]'
      }`}
    >
      <header className={`border-b border-stone-400 ${isKitchenCopy ? 'pb-1.5' : 'pb-3'}`}>
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-start gap-3">
            {restaurant?.logoUrl ? (
              <div className={`flex items-center justify-center p-1 ${isKitchenCopy ? 'h-11 w-11 print:h-10 print:w-10' : 'h-16 w-16 print:h-14 print:w-14'}`}>
                <img
                  src={restaurant.logoUrl}
                  alt={restaurant.name}
                  className="max-h-full max-w-full object-contain"
                />
              </div>
            ) : null}
            <div className="w-px self-stretch bg-stone-300" />
            <div className="pt-1">
              {restaurant?.name ? (
                <p className={`font-bold text-stone-950 ${isKitchenCopy ? 'text-[18px] print:text-[17px]' : 'text-[19px] tracking-[0.08em] print:text-[16px]'}`}>
                  {restaurant.name}
                </p>
              ) : null}
              {restaurantContacts.length > 0 ? (
                <div className={`flex flex-wrap items-center gap-x-2 gap-y-1 font-bold text-stone-900 ${isKitchenCopy ? 'mt-0.5 text-[11px] print:text-[11px]' : 'mt-1.5 text-[11px] print:text-[10px]'}`}>
                  <span>Contact:</span>
                  {restaurantContacts.map((contact) => (
                    <span key={contact} className="rounded-full bg-stone-100 px-2 py-0.5 text-stone-950">
                      {contact}
                    </span>
                  ))}
                </div>
              ) : null}
            </div>
          </div>
          <div className={`${isKitchenCopy ? 'pt-1' : 'pt-3'} text-right`}>
            <p className={`font-bold uppercase text-stone-950 ${isKitchenCopy ? 'text-[18px] print:text-[17px]' : 'text-base tracking-[0.14em] print:text-[15px]'}`}>
              {isKitchenCopy ? 'Kitchen Print' : 'Booking Summary'}
            </p>
            {!isKitchenCopy && restaurant?.address && restaurant.address.trim().toLowerCase() !== 'na' ? (
              <p className="mt-2 max-w-[220px] text-xs leading-5 text-stone-500 print:max-w-[180px] print:text-[10px]">
                {restaurant.address}
              </p>
            ) : null}
          </div>
        </div>
      </header>

      <section className={`${isKitchenCopy ? 'mt-2 grid gap-1.5 md:grid-cols-2 print:grid-cols-2 print:gap-1.5' : 'mt-3 grid gap-3 md:grid-cols-2 print:grid-cols-2 print:gap-2'}`}>
        <CompactTable
          title="Event Details"
          compact
          strong
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
          compact
          strong
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

      <section className={`${isKitchenCopy ? 'mt-2' : 'mt-3 print:mt-2'} overflow-hidden rounded-[10px] border border-stone-400`}>
        <div className={`${isKitchenCopy ? 'px-2 py-1' : 'px-3 py-1.5'} border-b border-stone-400 bg-stone-100`}>
          <p className="text-[12px] font-bold uppercase text-stone-950">
            Selected Menu Snapshot
          </p>
        </div>
        {isKitchenCopy ? (
          <table className="min-w-full table-fixed border-collapse text-[12px] leading-tight text-stone-950 print:text-[12px]">
            <tbody>
              {menuSectionRows.length > 0 ? (
                menuSectionRows.map((row, rowIndex) => (
                  <tr key={`kitchen-menu-${rowIndex}`}>
                    {row.map((section, cellIndex) => (
                      <td
                        key={section?.key ?? `empty-${rowIndex}-${cellIndex}`}
                        className="w-1/3 border-b border-r border-stone-400 align-top last:border-r-0"
                      >
                        {section ? (
                          <div className="min-h-full">
                            <div className="border-b border-stone-300 bg-stone-100 px-1.5 py-0.5 font-black uppercase text-stone-950">
                              {section.section} - {section.items.length}
                            </div>
                            <div className="px-1.5 py-1">
                              {section.items.map((item, index) => (
                                <div
                                  key={`${section.key}-${index}-${item}`}
                                  className="border-b border-dotted border-stone-300 py-0.5 font-semibold text-stone-900 last:border-b-0"
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr>
                  <td className="px-3 py-3 text-center font-bold text-stone-700">
                    Menu selection pending
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        ) : (
          <table className="min-w-full table-fixed border-collapse text-[12px] leading-tight text-stone-950 print:text-[12px]">
            <tbody>
              {menuSectionRows.length > 0 ? (
                menuSectionRows.map((row, rowIndex) => (
                  <tr key={`menu-section-${rowIndex}`}>
                    {row.map((section, cellIndex) => (
                      <td
                        key={section?.key ?? `empty-${rowIndex}-${cellIndex}`}
                        className="w-1/3 border-b border-r border-stone-400 align-top last:border-r-0"
                      >
                        {section ? (
                          <div>
                            <div className="border-b border-stone-300 bg-stone-100 px-1.5 py-0.5 font-black uppercase text-stone-950">
                              {section.section} - {section.items.length}
                            </div>
                            <div className="px-1.5 py-1">
                              {section.items.map((item, index) => (
                                <div
                                  key={`${section.key}-${index}-${item}`}
                                  className="border-b border-dotted border-stone-300 py-0.5 font-semibold text-stone-900 last:border-b-0"
                                >
                                  {item}
                                </div>
                              ))}
                            </div>
                          </div>
                        ) : null}
                      </td>
                    ))}
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
        )}
      </section>

      <section className={`${isKitchenCopy ? 'mt-2' : 'mt-3 print:mt-2'}`}>
        <div className={`${isKitchenCopy ? 'overflow-hidden rounded-[10px] border border-stone-400' : 'mt-2 overflow-hidden rounded-[10px] border border-stone-400'}`}>
          <div className={`grid grid-cols-2 divide-x ${isKitchenCopy ? 'divide-stone-400 bg-stone-100' : 'divide-stone-400 bg-stone-100'}`}>
            <SummaryCell
              label={isKitchenCopy ? 'Addon Data' : 'Addon Service'}
              value={addonServicesSummary}
              strong
              valueClassName="text-[12px] leading-4 print:text-[12px]"
            />
            <SummaryCell
              label="Total Addon Service"
              value={formatCurrency(addonServicesTotal)}
              strong
            />
          </div>
        </div>
      </section>

      {!isKitchenCopy ? (
        <section className="mt-4 print:break-before-page print:pt-2">
          <div className="overflow-hidden rounded-[10px] border border-stone-400">
            <table className="min-w-full border-collapse text-[12px] font-bold text-stone-950 print:text-[12px]">
              <thead className="bg-stone-100 text-stone-950">
                <tr>
                  <th className="border-b border-stone-400 px-2 py-1 text-left font-black uppercase">Date</th>
                  <th className="border-b border-stone-400 px-2 py-1 text-left font-black uppercase">Mode</th>
                  <th className="border-b border-stone-400 px-2 py-1 text-left font-black uppercase">Amount</th>
                  <th className="border-b border-stone-400 px-2 py-1 text-left font-black uppercase">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {advanceRows.length > 0 ? (
                  <>
                    {advanceRows.map((payment, index) => (
                      <tr key={payment.id} className={index % 2 === 0 ? 'bg-white' : 'bg-stone-50/60'}>
                        <td className="border-b border-stone-300 px-2 py-1">{formatDateTime(payment.date)}</td>
                        <td className="border-b border-stone-300 px-2 py-1">{payment.paymentMode}</td>
                        <td className="border-b border-stone-300 px-2 py-1">{formatCurrency(payment.amount)}</td>
                        <td className="border-b border-stone-300 px-2 py-1">{payment.remark || '-'}</td>
                      </tr>
                    ))}
                    <tr className="bg-stone-100">
                      <td className="px-2 py-1 font-black uppercase text-stone-950">Advance Payment</td>
                      <td className="px-2 py-1 text-right font-black uppercase text-stone-950">Total Advance Payment</td>
                      <td className="px-2 py-1 font-black text-stone-950">{formatCurrency(order.advanceAmount)}</td>
                      <td className="px-2 py-1" />
                    </tr>
                  </>
                ) : (
                  <tr>
                    <td colSpan={4} className="px-3 py-3 text-center font-bold text-stone-700">
                      No advance entries recorded.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <section className="print:break-inside-avoid print:[page-break-inside:avoid]">
            <section className="mt-3 pt-3 print:mt-2 print:pt-2">
              <p className="text-[12px] font-bold text-stone-950 print:text-[12px]">
                I agree to all banquet rules and confirm that I have read and understood them.
              </p>
            </section>

            <section className="mt-3 grid gap-4 pb-3 pt-3 md:grid-cols-2 print:mt-2 print:grid-cols-2 print:gap-3 print:pb-3 print:pt-2">
              <SignatureBox label="Customer Sign" strong />
              <SignatureBox label="Manager Sign" strong />
            </section>
          </section>

          <section className="mt-3 overflow-hidden rounded-[10px] border border-stone-400 print:mt-2">
            <div className="border-b border-stone-400 bg-stone-100 px-2 py-1">
              <p className="text-[12px] font-black uppercase text-stone-950">
                Banquet Rules
              </p>
            </div>
            <div className="px-2 py-2 print:px-2 print:py-1.5">
              {banquetRules.length > 0 ? (
                <ol className="space-y-1 pl-5 text-[12px] font-bold leading-snug text-stone-950 print:text-[12px]">
                  {banquetRules.map((rule) => (
                    <li key={rule.id}>{rule.label}</li>
                  ))}
                </ol>
              ) : (
                <p className="text-[12px] font-bold text-stone-700 print:text-[12px]">
                  No banquet rules configured.
                </p>
              )}
            </div>
          </section>
        </section>
      ) : null}

    </article>
  );
}

function CompactTable({
  title,
  rows,
  compact = false,
  strong = false,
}: {
  title: string;
  rows: Array<[string, string]>;
  compact?: boolean;
  strong?: boolean;
}) {
  return (
    <section className={`overflow-hidden ${strong ? 'rounded-[10px] border border-stone-400' : 'rounded-[14px] border border-stone-300'}`}>
      <div className={`${strong ? 'border-b border-stone-400 bg-stone-100 px-2 py-1' : 'border-b border-stone-300 bg-stone-50 px-3 py-2 print:px-2 print:py-1.5'}`}>
        <p className={`${strong ? 'text-[12px] font-bold text-stone-950' : 'text-xs font-semibold tracking-[0.24em] text-stone-700'} uppercase`}>
          {title}
        </p>
      </div>
      <div className={strong ? 'divide-y divide-stone-300' : 'divide-y divide-stone-200'}>
        {rows.map(([label, value]) => {
          return (
            <div
              key={`${title}-${label}`}
              className={`grid gap-2 px-2 ${compact ? 'grid-cols-[minmax(0,34%)_minmax(0,66%)] py-0.5 text-[13px] print:grid-cols-[minmax(0,34%)_minmax(0,66%)] print:py-0.5 print:text-[13px]' : 'grid-cols-[145px_minmax(0,1fr)] px-3 py-2 text-[11px] print:grid-cols-[118px_minmax(0,1fr)] print:py-1 print:text-[10px]'}`}
            >
              <span className={strong ? 'min-w-0 font-bold uppercase leading-tight text-stone-700 [overflow-wrap:anywhere]' : 'font-medium text-stone-500'}>{label}</span>
              <span className={strong ? 'min-w-0 font-bold leading-tight text-stone-950 [overflow-wrap:anywhere]' : 'font-semibold text-stone-900'}>{value}</span>
            </div>
          );
        })}
      </div>
    </section>
  );
}

function SignatureBox({ label, strong = false }: { label: string; strong?: boolean }) {
  return (
    <div className={`${strong ? 'rounded-[10px] border border-stone-400 px-3 pb-2 pt-5 print:px-2 print:pb-2 print:pt-4' : 'rounded-[12px] border border-stone-300 px-4 pb-3 pt-6 print:px-3 print:pb-2 print:pt-5'} print:break-inside-avoid print:[page-break-inside:avoid]`}>
      <div className={`${strong ? 'h-8 border-b border-stone-700 print:h-7' : 'h-8 border-b border-stone-500 print:h-7'}`} />
      <p className={`${strong ? 'mt-2 text-[12px] font-black text-stone-950 print:text-[12px]' : 'mt-2 text-xs font-semibold tracking-[0.2em] text-stone-600'} text-center uppercase`}>
        {label}
      </p>
    </div>
  );
}

function SummaryCell({
  label,
  value,
  valueClassName = '',
  strong = false,
}: {
  label: string;
  value: string;
  valueClassName?: string;
  strong?: boolean;
}) {
  return (
    <div className={strong ? 'px-2 py-1' : 'px-3 py-2'}>
      <p className={`${strong ? 'text-[12px] font-black text-stone-950' : 'text-[10px] font-semibold tracking-[0.24em] text-stone-600'} uppercase`}>
        {label}
      </p>
      <p className={`${strong ? 'mt-0.5 text-[13px] font-black text-stone-950' : 'mt-1 text-sm font-semibold text-stone-900'} ${valueClassName}`.trim()}>
        {value}
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

function buildMenuSectionRows(order: Order, columns: number) {
  const sections: MenuSectionBox[] = order.menuSelectionSnapshot.flatMap((menu) =>
    menu.sections.map((section) => ({
      key: `${menu.menuId}-${section.sectionTitle}`,
      section: section.sectionTitle,
      items: section.items,
    })),
  );
  const rows: Array<Array<MenuSectionBox | null>> = [];

  for (let index = 0; index < sections.length; index += columns) {
    const row: Array<MenuSectionBox | null> = sections.slice(index, index + columns);
    while (row.length < columns) {
      row.push(null);
    }
    rows.push(row);
  }

  return rows;
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

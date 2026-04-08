'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { useEffect, useMemo, useState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAuth } from '@/components/auth/auth-provider';
import {
  fetchAdvancePaymentsReport,
  fetchEventPlannerReport,
  fetchItemSalesReport,
  fetchOrders,
  fetchSettings,
} from '@/lib/auth/api';
import {
  AdvancePaymentReportRow,
  EventPlannerReportRow,
  ItemSalesReportRow,
  Order,
  SettingOption,
} from '@/lib/auth/types';

type DownloadFormat = 'csv' | 'xlsx';
type ReportType = 'booking' | 'advance' | 'cancelled' | 'itemSales' | 'eventPlanner';
type BookingFieldKey =
  | 'eventDate'
  | 'inquiryDate'
  | 'confirmedAt'
  | 'serviceSlot'
  | 'customerName'
  | 'mobileNo'
  | 'eventType'
  | 'hallDetails'
  | 'packageCategory'
  | 'guests'
  | 'grandTotal'
  | 'advanceAmount'
  | 'pendingAmount'
  | 'bookedBy';
type CancelledFieldKey =
  | 'inquiryDate'
  | 'customerName'
  | 'mobileNo'
  | 'eventDate'
  | 'eventType'
  | 'hallDetails'
  | 'guests'
  | 'reason'
  | 'advanceAmount'
  | 'grandTotal'
  | 'pendingAmount'
  | 'bookedBy';

type AdvancePaymentFilters = {
  from: string;
  to: string;
  paymentMode: string;
  customer: string;
};

type BookingFilters = {
  from: string;
  to: string;
  status: 'CONFIRMED' | 'INQUIRY' | 'CANCELLED';
};

type CancelledFilters = {
  from: string;
  to: string;
  search: string;
};

type ItemSalesFilters = {
  from: string;
  to: string;
};

type EventPlannerFilters = {
  from: string;
  to: string;
  plannerName: string;
  search: string;
};

type ColumnDef<Row> = {
  key: string;
  label: string;
  isCurrency?: boolean;
  render: (row: Row) => string;
  exportValue?: (row: Row) => string | number;
  total?: (row: Row) => number;
};

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
const dateInputCls = `${inputCls} [color-scheme:light] [--tw-shadow:0_0_0_1000px_white_inset] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-fields-wrapper]:text-slate-900 [&::-webkit-datetime-edit-text]:text-slate-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80`;

const BOOKING_FIELDS_STORAGE_KEY = 'banquate_report_fields_booking_v2';
const CANCELLED_FIELDS_STORAGE_KEY = 'banquate_report_fields_cancelled_v1';

const BOOKING_FIELDS: Array<{ key: BookingFieldKey; label: string }> = [
  { key: 'eventDate', label: 'Function Date' },
  { key: 'inquiryDate', label: 'Inquiry Date' },
  { key: 'confirmedAt', label: 'Confirmed Date' },
  { key: 'serviceSlot', label: 'Slot Type' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'mobileNo', label: 'Mobile No' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'hallDetails', label: 'Hall Details' },
  { key: 'packageCategory', label: 'Package Category' },
  { key: 'guests', label: 'Guests' },
  { key: 'grandTotal', label: 'Grand Total' },
  { key: 'advanceAmount', label: 'Advance Amount' },
  { key: 'pendingAmount', label: 'Pending Amount' },
  { key: 'bookedBy', label: 'Booked By' },
];

const CANCELLED_FIELDS: Array<{ key: CancelledFieldKey; label: string }> = [
  { key: 'inquiryDate', label: 'Inquiry Date' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'mobileNo', label: 'Mobile No' },
  { key: 'eventDate', label: 'Function Date' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'hallDetails', label: 'Hall Details' },
  { key: 'guests', label: 'Guests' },
  { key: 'reason', label: 'Cancel Reason' },
  { key: 'advanceAmount', label: 'Advance Paid' },
  { key: 'grandTotal', label: 'Booking Total' },
  { key: 'pendingAmount', label: 'Pending Amount' },
  { key: 'bookedBy', label: 'Booked By' },
];

const REPORT_CARDS: Array<{
  type: ReportType;
  title: string;
  description: string;
  eyebrow: string;
}> = [
  {
    type: 'booking',
    title: 'Booking Report',
    description: 'Generate inquiry, confirmed, or cancelled booking reports with customizable columns and exports.',
    eyebrow: 'Bookings',
  },
  {
    type: 'advance',
    title: 'Advance Payment Report',
    description: 'Track advance collections by payment date, payment type, and customer with instant totals.',
    eyebrow: 'Collections',
  },
  {
    type: 'cancelled',
    title: 'Cancel Booking Report',
    description: 'Export cancelled booking history with reason, advance paid, totals, and inquiry details.',
    eyebrow: 'Cancellations',
  },
  {
    type: 'itemSales',
    title: 'Item Sales Report',
    description: 'See item-wise sales for confirmed bookings by date range, sorted from highest selling to lowest.',
    eyebrow: 'Sales',
  },
  {
    type: 'eventPlanner',
    title: 'Event Planner Report',
    description: 'Review which confirmed bookings were assigned to which event planner and export the planner-wise schedule by date.',
    eyebrow: 'Planning',
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatExportAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function escapeCsvValue(value: string | number | null) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function downloadBlob(blob: Blob, fileName: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  link.remove();
  URL.revokeObjectURL(url);
}

async function downloadTable(
  headers: string[],
  rows: Array<Array<string | number | null>>,
  fileName: string,
  format: DownloadFormat,
) {
  if (format === 'xlsx') {
    const { utils, write } = await import('xlsx');
    const worksheet = utils.aoa_to_sheet([headers, ...rows]);
    const workbook = utils.book_new();
    utils.book_append_sheet(workbook, worksheet, 'Report');
    const buffer = write(workbook, { bookType: 'xlsx', type: 'array' }) as ArrayBuffer;
    downloadBlob(
      new Blob([buffer], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      }),
      `${fileName}.xlsx`,
    );
    return;
  }

  const csvContent = [headers, ...rows]
    .map((row) => row.map((value) => escapeCsvValue(value)).join(','))
    .join('\n');

  downloadBlob(new Blob([csvContent], { type: 'text/csv;charset=utf-8;' }), `${fileName}.csv`);
}

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

function formatCsvDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '';
}

function formatCsvDateTime(value: string | null) {
  return value
    ? new Intl.DateTimeFormat('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      }).format(new Date(value))
    : '';
}

function formatTime12Hour(value: string | null) {
  if (!value) return '';
  const [rawHour, rawMinute] = value.split(':').map(Number);
  const suffix = rawHour >= 12 ? 'PM' : 'AM';
  const hour = rawHour % 12 || 12;
  return `${String(hour).padStart(2, '0')}:${String(rawMinute).padStart(2, '0')} ${suffix}`;
}

function formatEventDateWithTime(order: Order) {
  const date = formatCsvDate(order.eventDate);
  const time =
    order.startTime && order.endTime
      ? `${formatTime12Hour(order.startTime)} - ${formatTime12Hour(order.endTime)}`
      : order.startTime
        ? formatTime12Hour(order.startTime)
        : order.endTime
          ? formatTime12Hour(order.endTime)
          : '';

  if (date && time) return `${date} ${time}`;
  return date || time || '';
}

function validateDateRange(from: string, to: string) {
  if (!from || !to) {
    throw new Error('Start date and end date are required.');
  }
  if (from > to) {
    throw new Error('Start date cannot be later than end date.');
  }
}

function loadFieldSelection<T extends string>(
  storageKey: string,
  fields: Array<{ key: T }>,
) {
  if (typeof window === 'undefined') {
    return fields.map((field) => field.key);
  }

  const storedValue = window.localStorage.getItem(storageKey);
  if (!storedValue) {
    return fields.map((field) => field.key);
  }

  try {
    const parsed = JSON.parse(storedValue) as T[];
    const valid = fields.map((field) => field.key).filter((key) => parsed.includes(key));
    return valid.length > 0 ? valid : fields.map((field) => field.key);
  } catch {
    return fields.map((field) => field.key);
  }
}

function saveFieldSelection(storageKey: string, fields: string[]) {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(storageKey, JSON.stringify(fields));
}

function getBookingFieldValue(order: Order, fieldKey: BookingFieldKey | CancelledFieldKey) {
  switch (fieldKey) {
    case 'eventDate':
      return formatEventDateWithTime(order);
    case 'inquiryDate':
      return formatCsvDateTime(order.inquiryDate);
    case 'confirmedAt':
      return formatCsvDateTime(order.confirmedAt);
    case 'serviceSlot':
      return order.serviceSlot || '-';
    case 'customerName':
      return [order.customer.firstName, order.customer.lastName].filter(Boolean).join(' ');
    case 'mobileNo':
      return order.customer.phone;
    case 'eventType':
      return order.eventType || '-';
    case 'hallDetails':
      return order.hallDetails || '-';
    case 'packageCategory':
      return order.categorySnapshot
        ? `${order.categorySnapshot.name} (${formatCurrency(order.pricePerPlate)})`
        : '-';
    case 'guests':
      return order.pax ? String(order.pax) : '-';
    case 'grandTotal':
      return formatCurrency(order.grandTotal);
    case 'advanceAmount':
      return formatCurrency(order.advanceAmount);
    case 'pendingAmount':
      return formatCurrency(order.pendingAmount);
    case 'bookedBy':
      return order.bookingTakenBy || '-';
    case 'reason':
      return order.cancelReason || '-';
    default:
      return '-';
  }
}

function getBookingExportValue(order: Order, fieldKey: BookingFieldKey | CancelledFieldKey) {
  switch (fieldKey) {
    case 'packageCategory':
      return order.categorySnapshot
        ? `${order.categorySnapshot.name} (${formatExportAmount(order.pricePerPlate)})`
        : '-';
    case 'grandTotal':
      return formatExportAmount(order.grandTotal);
    case 'advanceAmount':
      return formatExportAmount(order.advanceAmount);
    case 'pendingAmount':
      return formatExportAmount(order.pendingAmount);
    default:
      return getBookingFieldValue(order, fieldKey);
  }
}

function getBookingColumns(selectedFields: BookingFieldKey[]): ColumnDef<Order>[] {
  return selectedFields.map((fieldKey) => ({
    key: fieldKey,
    label: BOOKING_FIELDS.find((field) => field.key === fieldKey)?.label ?? fieldKey,
    isCurrency: ['grandTotal', 'advanceAmount', 'pendingAmount'].includes(fieldKey),
    render: (order) => getBookingFieldValue(order, fieldKey),
    exportValue: (order) => getBookingExportValue(order, fieldKey),
    total:
      fieldKey === 'grandTotal'
        ? (order) => order.grandTotal
        : fieldKey === 'advanceAmount'
          ? (order) => order.advanceAmount
          : fieldKey === 'pendingAmount'
            ? (order) => order.pendingAmount
            : undefined,
  }));
}

function getCancelledColumns(selectedFields: CancelledFieldKey[]): ColumnDef<Order>[] {
  return selectedFields.map((fieldKey) => ({
    key: fieldKey,
    label: CANCELLED_FIELDS.find((field) => field.key === fieldKey)?.label ?? fieldKey,
    isCurrency: ['grandTotal', 'advanceAmount', 'pendingAmount'].includes(fieldKey),
    render: (order) => getBookingFieldValue(order, fieldKey),
    exportValue: (order) => getBookingExportValue(order, fieldKey),
    total:
      fieldKey === 'grandTotal'
        ? (order) => order.grandTotal
        : fieldKey === 'advanceAmount'
          ? (order) => order.advanceAmount
          : fieldKey === 'pendingAmount'
            ? (order) => order.pendingAmount
            : undefined,
  }));
}

const advanceColumns: ColumnDef<AdvancePaymentReportRow>[] = [
  {
    key: 'paymentDate',
    label: 'Payment Date',
    render: (row) => formatCsvDateTime(row.paymentDate),
    exportValue: (row) => formatCsvDateTime(row.paymentDate),
  },
  { key: 'orderId', label: 'Booking Id', render: (row) => row.orderId },
  { key: 'customerName', label: 'Customer', render: (row) => row.customerName },
  { key: 'customerPhone', label: 'Phone', render: (row) => row.customerPhone || '-' },
  { key: 'paymentMode', label: 'Payment Type', render: (row) => row.paymentMode },
  {
    key: 'amount',
    label: 'Amount',
    isCurrency: true,
    render: (row) => formatCurrency(row.amount),
    exportValue: (row) => formatExportAmount(row.amount),
    total: (row) => row.amount,
  },
  { key: 'eventType', label: 'Event', render: (row) => row.eventType || '-' },
  {
    key: 'functionDate',
    label: 'Function Date',
    render: (row) => formatCsvDate(row.functionDate),
    exportValue: (row) => formatCsvDate(row.functionDate),
  },
  { key: 'recordedByName', label: 'Recorded By', render: (row) => row.recordedByName },
  { key: 'remark', label: 'Remarks', render: (row) => row.remark || '-' },
];

const itemSalesColumns: ColumnDef<ItemSalesReportRow>[] = [
  {
    key: 'itemName',
    label: 'Item',
    render: (row) => row.itemName,
    exportValue: (row) => row.itemName,
  },
  {
    key: 'timesSold',
    label: 'Times Sold',
    render: (row) => row.timesSold.toLocaleString('en-IN'),
    exportValue: (row) => row.timesSold,
    total: (row) => row.timesSold,
  },
  {
    key: 'subitems',
    label: 'Selected Subitems',
    render: (row) => row.subitems.join(', ') || '-',
    exportValue: (row) => row.subitems.join(', '),
  },
];

const eventPlannerColumns: ColumnDef<EventPlannerReportRow>[] = [
  {
    key: 'assignedAt',
    label: 'Assigned Date',
    render: (row) => formatCsvDateTime(row.assignedAt),
    exportValue: (row) => formatCsvDateTime(row.assignedAt),
  },
  { key: 'plannerName', label: 'Event Planner', render: (row) => row.plannerName },
  { key: 'orderId', label: 'Booking Id', render: (row) => row.orderId },
  { key: 'customerName', label: 'Customer', render: (row) => row.customerName },
  { key: 'customerPhone', label: 'Phone', render: (row) => row.customerPhone || '-' },
  { key: 'eventType', label: 'Function', render: (row) => row.eventType || '-' },
  {
    key: 'functionDate',
    label: 'Function Date',
    render: (row) => formatCsvDate(row.functionDate),
    exportValue: (row) => formatCsvDate(row.functionDate),
  },
  {
    key: 'pax',
    label: 'Guests',
    render: (row) => (row.pax ? row.pax.toLocaleString('en-IN') : '-'),
    exportValue: (row) => row.pax ?? '',
  },
  { key: 'serviceSlot', label: 'Service Slot', render: (row) => row.serviceSlot || '-' },
  { key: 'hallDetails', label: 'Hall Details', render: (row) => row.hallDetails || '-' },
  { key: 'assignedByName', label: 'Assigned By', render: (row) => row.assignedByName || '-' },
];

function FieldSelector<T extends string>({
  title,
  description,
  storageKey,
  options,
  selected,
  onChange,
  collapsed,
  onToggle,
}: {
  title: string;
  description: string;
  storageKey: string;
  options: Array<{ key: T; label: string }>;
  selected: T[];
  onChange: (next: T[]) => void;
  collapsed: boolean;
  onToggle: () => void;
}) {
  useEffect(() => {
    saveFieldSelection(storageKey, selected);
  }, [selected, storageKey]);

  return (
    <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
      <button
        type="button"
        onClick={onToggle}
        className="flex w-full items-center justify-between gap-4 text-left"
      >
        <div>
          <p className="text-sm font-semibold text-slate-900">{title}</p>
          <p className="mt-1 text-sm text-slate-500">{description}</p>
        </div>
        <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
          {selected.length} selected
        </span>
      </button>
      {!collapsed ? (
        <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {options.map((field) => (
            <label
              key={field.key}
              className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
            >
              <input
                type="checkbox"
                checked={selected.includes(field.key)}
                onChange={() => {
                  const nextSelection = selected.includes(field.key)
                    ? selected.filter((item) => item !== field.key)
                    : options
                        .map((item) => item.key)
                        .filter((item) => item === field.key || selected.includes(item));
                  onChange(nextSelection);
                }}
                className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
              />
              <span>{field.label}</span>
            </label>
          ))}
        </div>
      ) : null}
    </div>
  );
}

function SummaryTotals<Row>({
  rows,
  columns,
}: {
  rows: Row[];
  columns: ColumnDef<Row>[];
}) {
  const totalColumns = columns
    .filter((column) => column.total)
    .map((column) => ({
      key: column.key,
      label: column.label,
      value: rows.reduce((sum, row) => sum + (column.total ? column.total(row) : 0), 0),
    }))
    .filter((column) => column.value > 0);

  if (totalColumns.length === 0) return null;

  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {totalColumns.map((item) => (
        <div
          key={item.key}
          className="rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-4"
        >
          <p className="text-xs font-semibold uppercase tracking-[0.24em] text-amber-700">
            Total {item.label}
          </p>
          <p className="mt-3 text-2xl font-bold text-slate-900">{formatCurrency(item.value)}</p>
        </div>
      ))}
    </div>
  );
}

function DataTable<Row>({
  rows,
  columns,
  emptyMessage,
}: {
  rows: Row[];
  columns: ColumnDef<Row>[];
  emptyMessage: string;
}) {
  return (
    <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white">
      <div className="overflow-x-auto">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-slate-50 text-slate-500">
            <tr>
              {columns.map((column) => (
                <th key={column.key} className="px-4 py-3 font-medium whitespace-nowrap">
                  {column.label}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.length > 0 ? (
              rows.map((row, index) => (
                <tr key={index} className={index > 0 ? 'border-t border-slate-200' : ''}>
                  {columns.map((column) => (
                    <td
                      key={column.key}
                      className={`px-4 py-3 ${column.isCurrency ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                    >
                      {column.render(row)}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={columns.length} className="px-4 py-8 text-center text-slate-500">
                  {emptyMessage}
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export default function ReportViewPage() {
  const searchParams = useSearchParams();
  const { accessToken, user } = useAuth();
  const [error, setError] = useState('');
  const [paymentModes, setPaymentModes] = useState<string[]>([]);
  const [eventPlannerOptions, setEventPlannerOptions] = useState<string[]>([]);
  const [activeLoading, setActiveLoading] = useState(false);
  const [activeDownloading, setActiveDownloading] = useState(false);
  const [bookingFilters, setBookingFilters] = useState<BookingFilters>({
    from: toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: toDateInputValue(new Date()),
    status: 'CONFIRMED',
  });
  const [advanceFilters, setAdvanceFilters] = useState<AdvancePaymentFilters>({
    from: toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: toDateInputValue(new Date()),
    paymentMode: '',
    customer: '',
  });
  const [cancelledFilters, setCancelledFilters] = useState<CancelledFilters>({
    from: toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: toDateInputValue(new Date()),
    search: '',
  });
  const [itemSalesFilters, setItemSalesFilters] = useState<ItemSalesFilters>({
    from: toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: toDateInputValue(new Date()),
  });
  const [eventPlannerFilters, setEventPlannerFilters] = useState<EventPlannerFilters>({
    from: toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: toDateInputValue(new Date()),
    plannerName: '',
    search: '',
  });
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('csv');
  const [advanceDownloadFormat, setAdvanceDownloadFormat] = useState<DownloadFormat>('csv');
  const [cancelledDownloadFormat, setCancelledDownloadFormat] = useState<DownloadFormat>('csv');
  const [itemSalesDownloadFormat, setItemSalesDownloadFormat] = useState<DownloadFormat>('csv');
  const [eventPlannerDownloadFormat, setEventPlannerDownloadFormat] = useState<DownloadFormat>('csv');
  const [bookingFieldsCollapsed, setBookingFieldsCollapsed] = useState(true);
  const [cancelledFieldsCollapsed, setCancelledFieldsCollapsed] = useState(true);
  const [bookingSelectedFields, setBookingSelectedFields] = useState<BookingFieldKey[]>(() =>
    loadFieldSelection(BOOKING_FIELDS_STORAGE_KEY, BOOKING_FIELDS),
  );
  const [cancelledSelectedFields, setCancelledSelectedFields] = useState<CancelledFieldKey[]>(() =>
    loadFieldSelection(CANCELLED_FIELDS_STORAGE_KEY, CANCELLED_FIELDS),
  );
  const [bookingRows, setBookingRows] = useState<Order[]>([]);
  const [advanceRows, setAdvanceRows] = useState<AdvancePaymentReportRow[]>([]);
  const [cancelledRows, setCancelledRows] = useState<Order[]>([]);
  const [itemSalesRows, setItemSalesRows] = useState<ItemSalesReportRow[]>([]);
  const [eventPlannerRows, setEventPlannerRows] = useState<EventPlannerReportRow[]>([]);
  const reportParam = searchParams.get('type');
  const activeReport: ReportType =
    reportParam === 'advance' ||
    reportParam === 'cancelled' ||
    reportParam === 'booking' ||
    reportParam === 'itemSales' ||
    reportParam === 'eventPlanner'
      ? reportParam
      : 'booking';
  const activeCard = REPORT_CARDS.find((card) => card.type === activeReport) ?? REPORT_CARDS[0];

  useEffect(() => {
    if (!accessToken || user?.role !== 'company_admin') return;
    fetchSettings(accessToken)
      .then((settings) => {
        setPaymentModes(settings.paymentOptions.map((option: SettingOption) => option.label));
        setEventPlannerOptions(settings.eventPlanners.map((option: SettingOption) => option.label));
      })
      .catch(() => {
        setPaymentModes([]);
        setEventPlannerOptions([]);
      });
  }, [accessToken, user?.role]);

  const bookingColumns = useMemo(
    () => getBookingColumns(bookingSelectedFields),
    [bookingSelectedFields],
  );
  const cancelledColumns = useMemo(
    () => getCancelledColumns(cancelledSelectedFields),
    [cancelledSelectedFields],
  );

  if (user?.role !== 'company_admin') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Reports are available for company admin only.
        </p>
      </div>
    );
  }

  async function loadAllOrders(filters: {
    status: string;
    from: string;
    to: string;
    search?: string;
  }) {
    if (!accessToken) throw new Error('Missing session token.');
    validateDateRange(filters.from, filters.to);

    const allOrders: Order[] = [];
    let nextPage = 1;
    let totalPages = 1;

    do {
      const response = await fetchOrders(accessToken, {
        page: nextPage,
        limit: 100,
        search: filters.search ?? '',
        status: filters.status,
        from: filters.from,
        to: filters.to,
        ...(filters.status === 'CONFIRMED'
          ? {
              sortBy: 'confirmedAt',
              sortDirection: 'asc' as const,
            }
          : {}),
      });
      allOrders.push(...response.items);
      totalPages = response.pagination.totalPages;
      nextPage += 1;
    } while (nextPage <= totalPages);

    return allOrders;
  }

  async function handleViewReport() {
    try {
      setActiveLoading(true);
      setError('');

      if (activeReport === 'booking') {
        if (bookingSelectedFields.length === 0) {
          throw new Error('Select at least one booking report field.');
        }
        const orders = await loadAllOrders(bookingFilters);
        setBookingRows(orders);
        return;
      }

      if (activeReport === 'advance') {
        validateDateRange(advanceFilters.from, advanceFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows = await fetchAdvancePaymentsReport(accessToken, advanceFilters);
        setAdvanceRows(rows);
        return;
      }

      if (activeReport === 'itemSales') {
        validateDateRange(itemSalesFilters.from, itemSalesFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows = await fetchItemSalesReport(accessToken, itemSalesFilters);
        setItemSalesRows(rows);
        return;
      }

      if (activeReport === 'eventPlanner') {
        validateDateRange(eventPlannerFilters.from, eventPlannerFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows = await fetchEventPlannerReport(accessToken, eventPlannerFilters);
        setEventPlannerRows(rows);
        return;
      }

      if (cancelledSelectedFields.length === 0) {
        throw new Error('Select at least one cancelled booking report field.');
      }
      const orders = await loadAllOrders({
        status: 'CANCELLED',
        from: cancelledFilters.from,
        to: cancelledFilters.to,
        search: cancelledFilters.search,
      });
      setCancelledRows(orders);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to load report.',
      );
    } finally {
      setActiveLoading(false);
    }
  }

  async function handleDownloadReport() {
    try {
      setActiveDownloading(true);
      setError('');

      if (activeReport === 'booking') {
        if (bookingSelectedFields.length === 0) {
          throw new Error('Select at least one booking report field.');
        }
        const rows = bookingRows.length > 0 ? bookingRows : await loadAllOrders(bookingFilters);
        setBookingRows(rows);
        await downloadTable(
          bookingColumns.map((column) => column.label),
          rows.map((row) => bookingColumns.map((column) => (column.exportValue ? column.exportValue(row) : column.render(row)))),
          `booking-report-${bookingFilters.status.toLowerCase()}-${bookingFilters.from}-to-${bookingFilters.to}`,
          downloadFormat,
        );
        return;
      }

      if (activeReport === 'advance') {
        validateDateRange(advanceFilters.from, advanceFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows =
          advanceRows.length > 0
            ? advanceRows
            : await fetchAdvancePaymentsReport(accessToken, advanceFilters);
        setAdvanceRows(rows);
        await downloadTable(
          advanceColumns.map((column) => column.label),
          rows.map((row) =>
            advanceColumns.map((column) =>
              column.exportValue ? column.exportValue(row) : column.render(row),
            ),
          ),
          `advance-payments-report-${advanceFilters.from}-to-${advanceFilters.to}`,
          advanceDownloadFormat,
        );
        return;
      }

      if (activeReport === 'itemSales') {
        validateDateRange(itemSalesFilters.from, itemSalesFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows =
          itemSalesRows.length > 0
            ? itemSalesRows
            : await fetchItemSalesReport(accessToken, itemSalesFilters);
        setItemSalesRows(rows);
        await downloadTable(
          itemSalesColumns.map((column) => column.label),
          rows.map((row) =>
            itemSalesColumns.map((column) =>
              column.exportValue ? column.exportValue(row) : column.render(row),
            ),
          ),
          `item-sales-report-${itemSalesFilters.from}-to-${itemSalesFilters.to}`,
          itemSalesDownloadFormat,
        );
        return;
      }

      if (activeReport === 'eventPlanner') {
        validateDateRange(eventPlannerFilters.from, eventPlannerFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows =
          eventPlannerRows.length > 0
            ? eventPlannerRows
            : await fetchEventPlannerReport(accessToken, eventPlannerFilters);
        setEventPlannerRows(rows);
        await downloadTable(
          eventPlannerColumns.map((column) => column.label),
          rows.map((row) =>
            eventPlannerColumns.map((column) =>
              column.exportValue ? column.exportValue(row) : column.render(row),
            ),
          ),
          `event-planner-report-${eventPlannerFilters.from}-to-${eventPlannerFilters.to}`,
          eventPlannerDownloadFormat,
        );
        return;
      }

      if (cancelledSelectedFields.length === 0) {
        throw new Error('Select at least one cancelled booking report field.');
      }
      const rows =
        cancelledRows.length > 0
          ? cancelledRows
          : await loadAllOrders({
              status: 'CANCELLED',
              from: cancelledFilters.from,
              to: cancelledFilters.to,
              search: cancelledFilters.search,
            });
      setCancelledRows(rows);
      await downloadTable(
        cancelledColumns.map((column) => column.label),
        rows.map((row) =>
          cancelledColumns.map((column) =>
            column.exportValue ? column.exportValue(row) : column.render(row),
          ),
        ),
        `cancelled-bookings-report-${cancelledFilters.from}-to-${cancelledFilters.to}`,
        cancelledDownloadFormat,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to download report.',
      );
    } finally {
      setActiveDownloading(false);
    }
  }

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <Link
              href="/reports"
              className="inline-flex items-center gap-2 text-sm font-medium text-slate-500 transition hover:text-slate-900"
            >
              <span className="text-base leading-none">←</span>
              <span>Back to report selection</span>
            </Link>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
              {activeCard.eyebrow}
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">{activeCard.title}</h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              {activeCard.description}
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Static export ready
          </div>
        </div>
      </section>

      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        {activeReport === 'booking' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Booking Report Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a date range and booking status, then preview or export the result.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Start Date</span>
                <input
                  type="date"
                  value={bookingFilters.from}
                  onChange={(event) =>
                    setBookingFilters((current) => ({ ...current, from: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">End Date</span>
                <input
                  type="date"
                  value={bookingFilters.to}
                  onChange={(event) =>
                    setBookingFilters((current) => ({ ...current, to: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Status</span>
                <select
                  value={bookingFilters.status}
                  onChange={(event) =>
                    setBookingFilters((current) => ({
                      ...current,
                      status: event.target.value as BookingFilters['status'],
                    }))
                  }
                  className={inputCls}
                >
                  <option value="CONFIRMED">Confirmed</option>
                  <option value="INQUIRY">Inquiry</option>
                  <option value="CANCELLED">Cancelled</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={downloadFormat}
                  onChange={(event) => setDownloadFormat(event.target.value as DownloadFormat)}
                  className={inputCls}
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={activeLoading}
                  onClick={() => void handleViewReport()}
                  className="inline-flex w-full items-center justify-center rounded-xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {activeLoading ? 'Loading…' : 'View report'}
                </button>
              </div>
              <div className="flex items-end">
                <LoadingButton
                  type="button"
                  disabled={activeDownloading}
                  onClick={() => void handleDownloadReport()}
                  isLoading={activeDownloading}
                  className="inline-flex w-full items-center justify-center rounded-xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  Download report
                </LoadingButton>
              </div>
            </div>
            <FieldSelector
              title="Report Fields"
              description="Choose the columns to include in the table and exported report."
              storageKey={BOOKING_FIELDS_STORAGE_KEY}
              options={BOOKING_FIELDS}
              selected={bookingSelectedFields}
              onChange={setBookingSelectedFields}
              collapsed={bookingFieldsCollapsed}
              onToggle={() => setBookingFieldsCollapsed((current) => !current)}
            />
          </div>
        ) : null}

        {activeReport === 'advance' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Advance Payment Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filter collected advances by date, payment type, and customer.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Start Date</span>
                <input
                  type="date"
                  value={advanceFilters.from}
                  onChange={(event) =>
                    setAdvanceFilters((current) => ({ ...current, from: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">End Date</span>
                <input
                  type="date"
                  value={advanceFilters.to}
                  onChange={(event) =>
                    setAdvanceFilters((current) => ({ ...current, to: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Payment Type</span>
                <select
                  value={advanceFilters.paymentMode}
                  onChange={(event) =>
                    setAdvanceFilters((current) => ({ ...current, paymentMode: event.target.value }))
                  }
                  className={inputCls}
                >
                  <option value="">All payment types</option>
                  {paymentModes.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Customer</span>
                <input
                  value={advanceFilters.customer}
                  onChange={(event) =>
                    setAdvanceFilters((current) => ({ ...current, customer: event.target.value }))
                  }
                  placeholder="Name, phone, or booking id"
                  className={inputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={advanceDownloadFormat}
                  onChange={(event) =>
                    setAdvanceDownloadFormat(event.target.value as DownloadFormat)
                  }
                  className={inputCls}
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={activeLoading}
                  onClick={() => void handleViewReport()}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {activeLoading ? 'Loading…' : 'View report'}
                </button>
              </div>
              <div className="flex items-end">
                <LoadingButton
                  type="button"
                  disabled={activeDownloading}
                  onClick={() => void handleDownloadReport()}
                  isLoading={activeDownloading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  Download report
                </LoadingButton>
              </div>
            </div>
          </div>
        ) : null}

        {activeReport === 'cancelled' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Cancel Booking Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Generate cancelled booking history for a date range and narrow it with customer or booking search.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Start Date</span>
                <input
                  type="date"
                  value={cancelledFilters.from}
                  onChange={(event) =>
                    setCancelledFilters((current) => ({ ...current, from: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">End Date</span>
                <input
                  type="date"
                  value={cancelledFilters.to}
                  onChange={(event) =>
                    setCancelledFilters((current) => ({ ...current, to: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Search</span>
                <input
                  value={cancelledFilters.search}
                  onChange={(event) =>
                    setCancelledFilters((current) => ({ ...current, search: event.target.value }))
                  }
                  placeholder="Booking id, customer, phone, or reason"
                  className={inputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={cancelledDownloadFormat}
                  onChange={(event) =>
                    setCancelledDownloadFormat(event.target.value as DownloadFormat)
                  }
                  className={inputCls}
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={activeLoading}
                  onClick={() => void handleViewReport()}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {activeLoading ? 'Loading…' : 'View report'}
                </button>
              </div>
              <div className="flex items-end">
                <LoadingButton
                  type="button"
                  disabled={activeDownloading}
                  onClick={() => void handleDownloadReport()}
                  isLoading={activeDownloading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  Download report
                </LoadingButton>
              </div>
            </div>
            <FieldSelector
              title="Report Fields"
              description="Choose the columns to include in the cancelled booking report."
              storageKey={CANCELLED_FIELDS_STORAGE_KEY}
              options={CANCELLED_FIELDS}
              selected={cancelledSelectedFields}
              onChange={setCancelledSelectedFields}
              collapsed={cancelledFieldsCollapsed}
              onToggle={() => setCancelledFieldsCollapsed((current) => !current)}
            />
          </div>
        ) : null}

        {activeReport === 'itemSales' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Item Sales Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select confirmed dates to see item-wise sales from highest selling to lowest.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Start Date</span>
                <input
                  type="date"
                  value={itemSalesFilters.from}
                  onChange={(event) =>
                    setItemSalesFilters((current) => ({ ...current, from: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">End Date</span>
                <input
                  type="date"
                  value={itemSalesFilters.to}
                  onChange={(event) =>
                    setItemSalesFilters((current) => ({ ...current, to: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={itemSalesDownloadFormat}
                  onChange={(event) =>
                    setItemSalesDownloadFormat(event.target.value as DownloadFormat)
                  }
                  className={inputCls}
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={activeLoading}
                  onClick={() => void handleViewReport()}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {activeLoading ? 'Loading…' : 'View report'}
                </button>
              </div>
              <div className="flex items-end">
                <LoadingButton
                  type="button"
                  disabled={activeDownloading}
                  onClick={() => void handleDownloadReport()}
                  isLoading={activeDownloading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  Download report
                </LoadingButton>
              </div>
            </div>
          </div>
        ) : null}

        {activeReport === 'eventPlanner' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Event Planner Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Review planner-wise confirmed booking assignments by assignment date, planner, or customer search.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Start Date</span>
                <input
                  type="date"
                  value={eventPlannerFilters.from}
                  onChange={(event) =>
                    setEventPlannerFilters((current) => ({ ...current, from: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">End Date</span>
                <input
                  type="date"
                  value={eventPlannerFilters.to}
                  onChange={(event) =>
                    setEventPlannerFilters((current) => ({ ...current, to: event.target.value }))
                  }
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Event Planner</span>
                <select
                  value={eventPlannerFilters.plannerName}
                  onChange={(event) =>
                    setEventPlannerFilters((current) => ({ ...current, plannerName: event.target.value }))
                  }
                  className={inputCls}
                >
                  <option value="">All planners</option>
                  {eventPlannerOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Search</span>
                <input
                  value={eventPlannerFilters.search}
                  onChange={(event) =>
                    setEventPlannerFilters((current) => ({ ...current, search: event.target.value }))
                  }
                  placeholder="Booking id, function, customer, or phone"
                  className={inputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={eventPlannerDownloadFormat}
                  onChange={(event) =>
                    setEventPlannerDownloadFormat(event.target.value as DownloadFormat)
                  }
                  className={inputCls}
                >
                  <option value="csv">CSV</option>
                  <option value="xlsx">Excel</option>
                </select>
              </label>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={activeLoading}
                  onClick={() => void handleViewReport()}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {activeLoading ? 'Loading…' : 'View report'}
                </button>
              </div>
              <div className="flex items-end">
                <LoadingButton
                  type="button"
                  disabled={activeDownloading}
                  onClick={() => void handleDownloadReport()}
                  isLoading={activeDownloading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  Download report
                </LoadingButton>
              </div>
            </div>
          </div>
        ) : null}
      </section>

      {error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : null}

      {activeReport === 'booking' ? (
        <div className="space-y-4">
          <SummaryTotals rows={bookingRows} columns={bookingColumns} />
          <DataTable
            rows={bookingRows}
            columns={bookingColumns}
            emptyMessage="Generate the booking report to preview results here."
          />
        </div>
      ) : null}

      {activeReport === 'advance' ? (
        <div className="space-y-4">
          <SummaryTotals rows={advanceRows} columns={advanceColumns} />
          <DataTable
            rows={advanceRows}
            columns={advanceColumns}
            emptyMessage="Generate the advance payment report to preview results here."
          />
        </div>
      ) : null}

      {activeReport === 'cancelled' ? (
        <div className="space-y-4">
          <SummaryTotals rows={cancelledRows} columns={cancelledColumns} />
          <DataTable
            rows={cancelledRows}
            columns={cancelledColumns}
            emptyMessage="Generate the cancelled booking report to preview results here."
          />
        </div>
      ) : null}

      {activeReport === 'itemSales' ? (
        <div className="space-y-4">
          <SummaryTotals rows={itemSalesRows} columns={itemSalesColumns} />
          <DataTable
            rows={itemSalesRows}
            columns={itemSalesColumns}
            emptyMessage="Generate the item sales report to preview results here."
          />
        </div>
      ) : null}

      {activeReport === 'eventPlanner' ? (
        <div className="space-y-4">
          <SummaryTotals rows={eventPlannerRows} columns={eventPlannerColumns} />
          <DataTable
            rows={eventPlannerRows}
            columns={eventPlannerColumns}
            emptyMessage="Generate the event planner report to preview results here."
          />
        </div>
      ) : null}
    </div>
  );
}

'use client';

import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import React, { useEffect, useMemo, useState } from 'react';
import { LoadingButton } from '@/components/ui/loading-button';
import { useAuth } from '@/components/auth/auth-provider';
import {
  fetchAdvanceSummary,
  fetchAdvancePaymentsReport,
  fetchEventPlannerReport,
  fetchHallOccupancyReport,
  fetchItemSalesReport,
  fetchOrders,
  fetchPendingPaymentsReport,
  fetchRepeatCustomersReport,
  fetchRevenueReport,
  fetchSettings,
  fetchTreasuryReport,
  fetchUpcomingEventsReport,
} from '@/lib/auth/api';
import {
  AdvanceSummary,
  AdvancePaymentReportRow,
  EventPlannerReportRow,
  HallOccupancyReportRow,
  ItemSalesReportRow,
  Order,
  PendingPaymentReportRow,
  RepeatCustomerReportRow,
  RevenueReportRow,
  SettingOption,
  TreasuryReport,
  UpcomingEventReportRow,
} from '@/lib/auth/types';
import { createExcelBlobFromTable } from '@/lib/excel';

type DownloadFormat = 'csv' | 'xlsx';
type ReportType =
  | 'booking'
  | 'advance'
  | 'cancelled'
  | 'itemSales'
  | 'eventPlanner'
  | 'pendingPayments'
  | 'revenue'
  | 'upcomingEvents'
  | 'hallOccupancy'
  | 'repeatCustomers'
  | 'treasury';
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

type PendingPaymentsFilters = {
  from: string;
  to: string;
  search: string;
};

type RevenueFilters = {
  from: string;
  to: string;
  groupBy: 'month' | 'eventType' | 'hall';
};

type UpcomingEventsFilters = {
  days: '7' | '15' | '30';
  search: string;
};

type HallOccupancyFilters = {
  from: string;
  to: string;
};

type RepeatCustomersFilters = {
  from: string;
  to: string;
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
  { key: 'pendingAmount', label: 'Remaining Voucher Balance' },
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
    title: 'Advance Collections',
    description: 'Track advance collections by payment date, payment type, and customer with instant totals.',
    eyebrow: 'Financial',
  },
  {
    type: 'cancelled',
    title: 'Cancellation Report',
    description: 'Export cancelled booking history with reason, advance paid, totals, and inquiry details.',
    eyebrow: 'Bookings',
  },
  {
    type: 'itemSales',
    title: 'Item Sales Report',
    description: 'See item-wise sales for confirmed bookings by date range, sorted from highest selling to lowest.',
    eyebrow: 'Operations',
  },
  {
    type: 'eventPlanner',
    title: 'Event Planner Report',
    description: 'Review which confirmed bookings were assigned to which event planner and export the planner-wise schedule by date.',
    eyebrow: 'Operations',
  },
  {
    type: 'pendingPayments',
    title: 'Pending Payments',
    description: 'All confirmed bookings with an outstanding balance. Filter by event date range or customer search.',
    eyebrow: 'Financial',
  },
  {
    type: 'revenue',
    title: 'Revenue Report',
    description: 'Monthly, event-type, or hall-wise revenue breakdown for confirmed bookings in a date range.',
    eyebrow: 'Financial',
  },
  {
    type: 'upcomingEvents',
    title: 'Upcoming Events',
    description: 'All confirmed events in the next 7, 15, or 30 days with customer, hall, slot, planner, and balance details.',
    eyebrow: 'Bookings',
  },
  {
    type: 'hallOccupancy',
    title: 'Hall Occupancy Report',
    description: 'Booking count, total guests, and revenue for each hall over any selected date range.',
    eyebrow: 'Operations',
  },
  {
    type: 'repeatCustomers',
    title: 'Repeat Customers',
    description: 'Customers with two or more confirmed bookings — total bookings, lifetime revenue, and booking dates.',
    eyebrow: 'Customers',
  },
  {
    type: 'treasury',
    title: 'Treasury Ledger',
    description: 'Full chronological ledger: confirmed advances, cancellations, dine-in usages, payouts, next booking adjustments, and forfeited amounts.',
    eyebrow: 'Financial',
  },
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

function formatAmountNumber(value: number) {
  return new Intl.NumberFormat('en-IN', { maximumFractionDigits: 0 }).format(value);
}

function InrAmount({
  value,
  className = '',
  symbolClassName = 'mr-px align-baseline text-[10px] font-bold opacity-50',
}: {
  value: number;
  className?: string;
  symbolClassName?: string;
}) {
  const absoluteValue = Math.abs(value);

  return (
    <span className={className}>
      {value < 0 ? '-' : ''}
      <span className={symbolClassName}>₹</span>
      {formatAmountNumber(absoluteValue)}
    </span>
  );
}

function formatCurrencyCell(value: number) {
  return <InrAmount value={value} />;
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
  options?: {
    reportName?: string;
    dateRange?: string;
    footerSections?: Array<{
      title: string;
      rows: Array<{
        label: string;
        value: string | number | null;
      }>;
    }>;
  },
) {
  if (format === 'xlsx') {
    const blob = await createExcelBlobFromTable('Report', headers, rows, {
      headerInfo: options?.reportName
        ? {
            reportName: options.reportName,
            dateRange: options.dateRange,
          }
        : undefined,
      footerSections: options?.footerSections,
    });
    downloadBlob(blob, `${fileName}.xlsx`);
    return;
  }

  const csvRows = [headers, ...rows];

  if (options?.footerSections?.length) {
    options.footerSections.forEach((section) => {
      csvRows.push([]);
      csvRows.push([section.title]);
      section.rows.forEach((row) => {
        csvRows.push([row.label, row.value]);
      });
    });
  }

  const csvContent = csvRows
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

function formatReportDateRange(from?: string, to?: string) {
  if (from && to) {
    return `Date Range: ${formatCsvDate(from)} to ${formatCsvDate(to)}`;
  }
  if (from) {
    return `Date Range: From ${formatCsvDate(from)}`;
  }
  if (to) {
    return `Date Range: Till ${formatCsvDate(to)}`;
  }
  return 'Date Range: All Dates';
}

function getQuickRange(months: number) {
  const today = new Date();
  const from = new Date(today.getFullYear(), today.getMonth() - (months - 1), 1);
  return {
    from: toDateInputValue(from),
    to: toDateInputValue(today),
  };
}

function QuickDatePresets({
  onApply,
}: {
  onApply: (range: { from: string; to: string }) => void;
}) {
  const presets = [1, 3, 6, 9, 12] as const;

  return (
    <div className="flex flex-wrap items-center gap-2">
      <span className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">
        Quick Select
      </span>
      {presets.map((months) => (
        <button
          key={months}
          type="button"
          onClick={() => onApply(getQuickRange(months))}
          className="rounded-full border border-slate-200 bg-slate-50 px-3 py-1.5 text-xs font-semibold text-slate-600 transition hover:border-amber-300 hover:bg-amber-50 hover:text-amber-700"
        >
          {months}M
        </button>
      ))}
    </div>
  );
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
      return order.functionName || order.eventType || '-';
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

function getCancelledPendingAmount(order: Order) {
  return order.redeemableBalance;
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
    render: (order) =>
      fieldKey === 'pendingAmount'
        ? formatCurrency(getCancelledPendingAmount(order))
        : getBookingFieldValue(order, fieldKey),
    exportValue: (order) =>
      fieldKey === 'pendingAmount'
        ? formatExportAmount(getCancelledPendingAmount(order))
        : getBookingExportValue(order, fieldKey),
    total:
      fieldKey === 'grandTotal'
        ? (order) => order.grandTotal
        : fieldKey === 'advanceAmount'
          ? (order) => order.advanceAmount
          : fieldKey === 'pendingAmount'
            ? (order) => getCancelledPendingAmount(order)
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

const pendingPaymentsColumns: ColumnDef<PendingPaymentReportRow>[] = [
  {
    key: 'functionDate',
    label: 'Event Date',
    render: (row) => formatCsvDate(row.functionDate),
    exportValue: (row) => formatCsvDate(row.functionDate),
  },
  { key: 'orderId', label: 'Booking Id', render: (row) => row.orderId },
  { key: 'customerName', label: 'Customer', render: (row) => row.customerName },
  { key: 'customerPhone', label: 'Phone', render: (row) => row.customerPhone || '-' },
  { key: 'eventType', label: 'Function', render: (row) => row.eventType || '-' },
  { key: 'hallDetails', label: 'Hall', render: (row) => row.hallDetails || '-' },
  { key: 'serviceSlot', label: 'Slot', render: (row) => row.serviceSlot || '-' },
  {
    key: 'pax',
    label: 'Guests',
    render: (row) => (row.pax ? row.pax.toLocaleString('en-IN') : '-'),
    exportValue: (row) => row.pax ?? '',
  },
  {
    key: 'grandTotal',
    label: 'Grand Total',
    isCurrency: true,
    render: (row) => formatCurrency(row.grandTotal),
    exportValue: (row) => formatExportAmount(row.grandTotal),
    total: (row) => row.grandTotal,
  },
  {
    key: 'advanceAmount',
    label: 'Advance Paid',
    isCurrency: true,
    render: (row) => formatCurrency(row.advanceAmount),
    exportValue: (row) => formatExportAmount(row.advanceAmount),
    total: (row) => row.advanceAmount,
  },
  {
    key: 'pendingAmount',
    label: 'Pending',
    isCurrency: true,
    render: (row) => formatCurrency(row.pendingAmount),
    exportValue: (row) => formatExportAmount(row.pendingAmount),
    total: (row) => row.pendingAmount,
  },
];

const revenueColumns: ColumnDef<RevenueReportRow>[] = [
  {
    key: 'label',
    label: 'Period / Group',
    render: (row) =>
      /^\d{4}-\d{2}$/.test(row.label)
        ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
            new Date(`${row.label}-01T00:00:00`),
          )
        : row.label,
    exportValue: (row) =>
      /^\d{4}-\d{2}$/.test(row.label)
        ? new Intl.DateTimeFormat('en-IN', { month: 'short', year: 'numeric' }).format(
            new Date(`${row.label}-01T00:00:00`),
          )
        : row.label,
  },
  {
    key: 'bookings',
    label: 'Bookings',
    render: (row) => row.bookings.toLocaleString('en-IN'),
    exportValue: (row) => row.bookings,
    total: (row) => row.bookings,
  },
  {
    key: 'revenue',
    label: 'Revenue',
    isCurrency: true,
    render: (row) => formatCurrency(row.revenue),
    exportValue: (row) => formatExportAmount(row.revenue),
    total: (row) => row.revenue,
  },
  {
    key: 'totalPax',
    label: 'Total Guests',
    render: (row) => row.totalPax.toLocaleString('en-IN'),
    exportValue: (row) => row.totalPax,
    total: (row) => row.totalPax,
  },
  {
    key: 'avgRevenue',
    label: 'Avg Revenue / Booking',
    isCurrency: true,
    render: (row) => formatCurrency(row.avgRevenue),
    exportValue: (row) => formatExportAmount(row.avgRevenue),
  },
];

const upcomingEventsColumns: ColumnDef<UpcomingEventReportRow>[] = [
  {
    key: 'functionDate',
    label: 'Event Date',
    render: (row) => formatCsvDate(row.functionDate),
    exportValue: (row) => formatCsvDate(row.functionDate),
  },
  { key: 'orderId', label: 'Booking Id', render: (row) => row.orderId },
  { key: 'customerName', label: 'Customer', render: (row) => row.customerName },
  { key: 'customerPhone', label: 'Phone', render: (row) => row.customerPhone || '-' },
  { key: 'eventType', label: 'Function', render: (row) => row.eventType || '-' },
  { key: 'hallDetails', label: 'Hall', render: (row) => row.hallDetails || '-' },
  { key: 'serviceSlot', label: 'Slot', render: (row) => row.serviceSlot || '-' },
  {
    key: 'pax',
    label: 'Guests',
    render: (row) => (row.pax ? row.pax.toLocaleString('en-IN') : '-'),
    exportValue: (row) => row.pax ?? '',
    total: (row) => row.pax ?? 0,
  },
  { key: 'plannerName', label: 'Event Planner', render: (row) => row.plannerName || '-' },
  {
    key: 'pendingAmount',
    label: 'Pending Balance',
    isCurrency: true,
    render: (row) => (row.pendingAmount > 0 ? formatCurrency(row.pendingAmount) : '—'),
    exportValue: (row) => formatExportAmount(row.pendingAmount),
    total: (row) => row.pendingAmount,
  },
];

const hallOccupancyColumns: ColumnDef<HallOccupancyReportRow>[] = [
  { key: 'hall', label: 'Hall', render: (row) => row.hall },
  {
    key: 'bookings',
    label: 'Total Bookings',
    render: (row) => row.bookings.toLocaleString('en-IN'),
    exportValue: (row) => row.bookings,
    total: (row) => row.bookings,
  },
  {
    key: 'revenue',
    label: 'Revenue',
    isCurrency: true,
    render: (row) => formatCurrency(row.revenue),
    exportValue: (row) => formatExportAmount(row.revenue),
    total: (row) => row.revenue,
  },
  {
    key: 'totalPax',
    label: 'Total Guests',
    render: (row) => row.totalPax.toLocaleString('en-IN'),
    exportValue: (row) => row.totalPax,
    total: (row) => row.totalPax,
  },
  {
    key: 'avgPax',
    label: 'Avg Guests / Booking',
    render: (row) => Math.round(row.avgPax).toLocaleString('en-IN'),
    exportValue: (row) => Math.round(row.avgPax),
  },
];

const repeatCustomersColumns: ColumnDef<RepeatCustomerReportRow>[] = [
  { key: 'customerName', label: 'Customer', render: (row) => row.customerName },
  { key: 'customerPhone', label: 'Phone', render: (row) => row.customerPhone || '-' },
  {
    key: 'totalBookings',
    label: 'Total Bookings',
    render: (row) => row.totalBookings.toLocaleString('en-IN'),
    exportValue: (row) => row.totalBookings,
    total: (row) => row.totalBookings,
  },
  {
    key: 'totalRevenue',
    label: 'Lifetime Revenue',
    isCurrency: true,
    render: (row) => formatCurrency(row.totalRevenue),
    exportValue: (row) => formatExportAmount(row.totalRevenue),
    total: (row) => row.totalRevenue,
  },
  {
    key: 'firstBookingDate',
    label: 'First Booking',
    render: (row) => formatCsvDate(row.firstBookingDate),
    exportValue: (row) => formatCsvDate(row.firstBookingDate),
  },
  {
    key: 'lastBookingDate',
    label: 'Last Booking',
    render: (row) => formatCsvDate(row.lastBookingDate),
    exportValue: (row) => formatCsvDate(row.lastBookingDate),
  },
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
      isCurrency: Boolean(column.isCurrency),
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
          <p className="mt-3 text-2xl font-bold text-slate-900">
            {item.isCurrency ? (
              <InrAmount
                value={item.value}
                symbolClassName="mr-0.5 align-[0.2em] text-xs font-bold opacity-50"
              />
            ) : (
              item.value.toLocaleString('en-IN')
            )}
          </p>
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
                      {column.isCurrency && column.total
                        ? formatCurrencyCell(column.total(row))
                        : column.render(row)}
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
  const [pendingPaymentsDownloadFormat, setPendingPaymentsDownloadFormat] = useState<DownloadFormat>('csv');
  const [revenueDownloadFormat, setRevenueDownloadFormat] = useState<DownloadFormat>('csv');
  const [upcomingEventsDownloadFormat, setUpcomingEventsDownloadFormat] = useState<DownloadFormat>('csv');
  const [hallOccupancyDownloadFormat, setHallOccupancyDownloadFormat] = useState<DownloadFormat>('csv');
  const [repeatCustomersDownloadFormat, setRepeatCustomersDownloadFormat] = useState<DownloadFormat>('csv');
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
  const [pendingPaymentsFilters, setPendingPaymentsFilters] = useState<PendingPaymentsFilters>({
    from: '',
    to: '',
    search: '',
  });
  const [revenueFilters, setRevenueFilters] = useState<RevenueFilters>({
    from: toDateInputValue(new Date(new Date().getFullYear(), 0, 1)),
    to: toDateInputValue(new Date()),
    groupBy: 'month',
  });
  const [upcomingEventsFilters, setUpcomingEventsFilters] = useState<UpcomingEventsFilters>({
    days: '30',
    search: '',
  });
  const [hallOccupancyFilters, setHallOccupancyFilters] = useState<HallOccupancyFilters>({
    from: toDateInputValue(new Date(new Date().getFullYear(), 0, 1)),
    to: toDateInputValue(new Date()),
  });
  const [repeatCustomersFilters, setRepeatCustomersFilters] = useState<RepeatCustomersFilters>({
    from: '',
    to: '',
  });
  const [pendingPaymentsRows, setPendingPaymentsRows] = useState<PendingPaymentReportRow[]>([]);
  const [revenueRows, setRevenueRows] = useState<RevenueReportRow[]>([]);
  const [upcomingEventsRows, setUpcomingEventsRows] = useState<UpcomingEventReportRow[]>([]);
  const [hallOccupancyRows, setHallOccupancyRows] = useState<HallOccupancyReportRow[]>([]);
  const [repeatCustomersRows, setRepeatCustomersRows] = useState<RepeatCustomerReportRow[]>([]);
  const [treasuryReport, setTreasuryReport] = useState<TreasuryReport | null>(null);
  const [treasuryAdvanceSummary, setTreasuryAdvanceSummary] = useState<AdvanceSummary | null>(null);
  const [treasuryFilters, setTreasuryFilters] = useState({ from: '', to: '' });
  const [treasuryDownloadFormat, setTreasuryDownloadFormat] = useState<DownloadFormat>('xlsx');
  const reportParam = searchParams.get('type');
  const activeReport: ReportType =
    reportParam === 'advance' ||
    reportParam === 'cancelled' ||
    reportParam === 'booking' ||
    reportParam === 'itemSales' ||
    reportParam === 'eventPlanner' ||
    reportParam === 'pendingPayments' ||
    reportParam === 'revenue' ||
    reportParam === 'upcomingEvents' ||
    reportParam === 'hallOccupancy' ||
    reportParam === 'repeatCustomers' ||
    reportParam === 'treasury'
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

      if (activeReport === 'pendingPayments') {
        if (!accessToken) throw new Error('Missing session token.');
        const rows = await fetchPendingPaymentsReport(accessToken, pendingPaymentsFilters);
        setPendingPaymentsRows(rows);
        return;
      }

      if (activeReport === 'revenue') {
        validateDateRange(revenueFilters.from, revenueFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows = await fetchRevenueReport(accessToken, revenueFilters);
        setRevenueRows(rows);
        return;
      }

      if (activeReport === 'upcomingEvents') {
        if (!accessToken) throw new Error('Missing session token.');
        const rows = await fetchUpcomingEventsReport(accessToken, upcomingEventsFilters);
        setUpcomingEventsRows(rows);
        return;
      }

      if (activeReport === 'hallOccupancy') {
        validateDateRange(hallOccupancyFilters.from, hallOccupancyFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows = await fetchHallOccupancyReport(accessToken, hallOccupancyFilters);
        setHallOccupancyRows(rows);
        return;
      }

      if (activeReport === 'repeatCustomers') {
        if (!accessToken) throw new Error('Missing session token.');
        const rows = await fetchRepeatCustomersReport(accessToken, repeatCustomersFilters);
        setRepeatCustomersRows(rows);
        return;
      }

      if (activeReport === 'treasury') {
        if (!accessToken) throw new Error('Missing session token.');
        const [report, summary] = await Promise.all([
          fetchTreasuryReport(accessToken, treasuryFilters),
          fetchAdvanceSummary(accessToken),
        ]);
        setTreasuryReport(report);
        setTreasuryAdvanceSummary(summary);
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
          {
            reportName: `Booking Report (${bookingFilters.status})`,
            dateRange: formatReportDateRange(bookingFilters.from, bookingFilters.to),
          },
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
          {
            reportName: 'Advance Payments Report',
            dateRange: formatReportDateRange(advanceFilters.from, advanceFilters.to),
          },
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
          {
            reportName: 'Item Sales Report',
            dateRange: formatReportDateRange(itemSalesFilters.from, itemSalesFilters.to),
          },
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
          {
            reportName: 'Event Planner Report',
            dateRange: formatReportDateRange(eventPlannerFilters.from, eventPlannerFilters.to),
          },
        );
        return;
      }

      if (activeReport === 'pendingPayments') {
        if (!accessToken) throw new Error('Missing session token.');
        const rows =
          pendingPaymentsRows.length > 0
            ? pendingPaymentsRows
            : await fetchPendingPaymentsReport(accessToken, pendingPaymentsFilters);
        setPendingPaymentsRows(rows);
        await downloadTable(
          pendingPaymentsColumns.map((c) => c.label),
          rows.map((row) => pendingPaymentsColumns.map((c) => (c.exportValue ? c.exportValue(row) : c.render(row)))),
          `pending-payments-report`,
          pendingPaymentsDownloadFormat,
          {
            reportName: 'Pending Payments Report',
            dateRange: formatReportDateRange(pendingPaymentsFilters.from, pendingPaymentsFilters.to),
          },
        );
        return;
      }

      if (activeReport === 'revenue') {
        validateDateRange(revenueFilters.from, revenueFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows =
          revenueRows.length > 0
            ? revenueRows
            : await fetchRevenueReport(accessToken, revenueFilters);
        setRevenueRows(rows);
        await downloadTable(
          revenueColumns.map((c) => c.label),
          rows.map((row) => revenueColumns.map((c) => (c.exportValue ? c.exportValue(row) : c.render(row)))),
          `revenue-report-${revenueFilters.from}-to-${revenueFilters.to}`,
          revenueDownloadFormat,
          {
            reportName: 'Revenue Report',
            dateRange: formatReportDateRange(revenueFilters.from, revenueFilters.to),
          },
        );
        return;
      }

      if (activeReport === 'upcomingEvents') {
        if (!accessToken) throw new Error('Missing session token.');
        const rows =
          upcomingEventsRows.length > 0
            ? upcomingEventsRows
            : await fetchUpcomingEventsReport(accessToken, upcomingEventsFilters);
        setUpcomingEventsRows(rows);
        await downloadTable(
          upcomingEventsColumns.map((c) => c.label),
          rows.map((row) => upcomingEventsColumns.map((c) => (c.exportValue ? c.exportValue(row) : c.render(row)))),
          `upcoming-events-${upcomingEventsFilters.days}-days`,
          upcomingEventsDownloadFormat,
          {
            reportName: 'Upcoming Events Report',
            dateRange: `Window: Next ${upcomingEventsFilters.days} days`,
          },
        );
        return;
      }

      if (activeReport === 'hallOccupancy') {
        validateDateRange(hallOccupancyFilters.from, hallOccupancyFilters.to);
        if (!accessToken) throw new Error('Missing session token.');
        const rows =
          hallOccupancyRows.length > 0
            ? hallOccupancyRows
            : await fetchHallOccupancyReport(accessToken, hallOccupancyFilters);
        setHallOccupancyRows(rows);
        await downloadTable(
          hallOccupancyColumns.map((c) => c.label),
          rows.map((row) => hallOccupancyColumns.map((c) => (c.exportValue ? c.exportValue(row) : c.render(row)))),
          `hall-occupancy-report-${hallOccupancyFilters.from}-to-${hallOccupancyFilters.to}`,
          hallOccupancyDownloadFormat,
          {
            reportName: 'Hall Occupancy Report',
            dateRange: formatReportDateRange(hallOccupancyFilters.from, hallOccupancyFilters.to),
          },
        );
        return;
      }

      if (activeReport === 'repeatCustomers') {
        if (!accessToken) throw new Error('Missing session token.');
        const rows =
          repeatCustomersRows.length > 0
            ? repeatCustomersRows
            : await fetchRepeatCustomersReport(accessToken, repeatCustomersFilters);
        setRepeatCustomersRows(rows);
        await downloadTable(
          repeatCustomersColumns.map((c) => c.label),
          rows.map((row) => repeatCustomersColumns.map((c) => (c.exportValue ? c.exportValue(row) : c.render(row)))),
          `repeat-customers-report`,
          repeatCustomersDownloadFormat,
          {
            reportName: 'Repeat Customers Report',
            dateRange: formatReportDateRange(repeatCustomersFilters.from, repeatCustomersFilters.to),
          },
        );
        return;
      }

      if (activeReport === 'treasury') {
        if (!accessToken) throw new Error('Missing session token.');
        const [report, summary] = await Promise.all([
          treasuryReport ? Promise.resolve(treasuryReport) : fetchTreasuryReport(accessToken, treasuryFilters),
          treasuryAdvanceSummary ? Promise.resolve(treasuryAdvanceSummary) : fetchAdvanceSummary(accessToken),
        ]);
        setTreasuryReport(report);
        setTreasuryAdvanceSummary(summary);
        const headers = ['Date', 'Type', 'Booking ID', 'Customer', 'Booking Date', 'Cancel Date', 'Phone', 'Amount', 'Mode', 'Note', 'Performed By', 'Running Balance'];
        const rows = [
          ...report.entries.map((e) => [
          formatCsvDateTime(e.createdAt || e.date),
          e.typeLabel,
          e.orderId,
          e.customerName,
          e.bookingDate ? new Date(e.bookingDate).toLocaleDateString('en-IN') : '',
          e.cancelDate ? new Date(e.cancelDate).toLocaleDateString('en-IN') : '',
          e.customerPhone,
          e.amount,
          e.mode ?? '',
          e.note ?? '',
          e.performedBy ?? '',
          e.runningBalance,
          ]),
        ];
        await downloadTable(headers, rows, `treasury-ledger-${treasuryFilters.from || 'all'}`, treasuryDownloadFormat, {
          reportName: 'Treasury Report',
          dateRange: formatReportDateRange(treasuryFilters.from, treasuryFilters.to),
          footerSections: [
            {
              title: 'Advance Summary',
              rows: [
                { label: 'Confirmed Advance', value: summary.confirmedAdvance },
                { label: 'Cancelled Advance', value: summary.cancelledAdvance },
                { label: 'Forfeited Advance', value: summary.forfeitedAdvance },
                { label: 'Total Advance', value: summary.total },
              ],
            },
          ],
        });
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
        {
          reportName: 'Cancellation Report',
          dateRange: formatReportDateRange(cancelledFilters.from, cancelledFilters.to),
        },
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
            <QuickDatePresets
              onApply={(range) =>
                setBookingFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
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
            <QuickDatePresets
              onApply={(range) =>
                setAdvanceFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
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
            <QuickDatePresets
              onApply={(range) =>
                setCancelledFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
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
            <QuickDatePresets
              onApply={(range) =>
                setItemSalesFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
          </div>
        ) : null}

        {activeReport === 'pendingPayments' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Pending Payments Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Optionally filter by event date range or search a customer. Leave dates empty to see all outstanding dues.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Event From</span>
                <input
                  type="date"
                  value={pendingPaymentsFilters.from}
                  onChange={(e) => setPendingPaymentsFilters((f) => ({ ...f, from: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Event To</span>
                <input
                  type="date"
                  value={pendingPaymentsFilters.to}
                  onChange={(e) => setPendingPaymentsFilters((f) => ({ ...f, to: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Search</span>
                <input
                  value={pendingPaymentsFilters.search}
                  onChange={(e) => setPendingPaymentsFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Name, phone, or booking id"
                  className={inputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={pendingPaymentsDownloadFormat}
                  onChange={(e) => setPendingPaymentsDownloadFormat(e.target.value as DownloadFormat)}
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
            <QuickDatePresets
              onApply={(range) =>
                setPendingPaymentsFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
          </div>
        ) : null}

        {activeReport === 'revenue' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Revenue Report Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Choose a date range and how you want to group the revenue — by month, event type, or hall.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_220px_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Start Date</span>
                <input
                  type="date"
                  value={revenueFilters.from}
                  onChange={(e) => setRevenueFilters((f) => ({ ...f, from: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">End Date</span>
                <input
                  type="date"
                  value={revenueFilters.to}
                  onChange={(e) => setRevenueFilters((f) => ({ ...f, to: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Group By</span>
                <select
                  value={revenueFilters.groupBy}
                  onChange={(e) => setRevenueFilters((f) => ({ ...f, groupBy: e.target.value as RevenueFilters['groupBy'] }))}
                  className={inputCls}
                >
                  <option value="month">Month</option>
                  <option value="eventType">Event Type</option>
                  <option value="hall">Hall</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={revenueDownloadFormat}
                  onChange={(e) => setRevenueDownloadFormat(e.target.value as DownloadFormat)}
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
            <QuickDatePresets
              onApply={(range) =>
                setRevenueFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
          </div>
        ) : null}

        {activeReport === 'upcomingEvents' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Upcoming Events Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select how many days ahead to look. Optionally narrow by customer, booking id, or event type.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[200px_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Window</span>
                <select
                  value={upcomingEventsFilters.days}
                  onChange={(e) => setUpcomingEventsFilters((f) => ({ ...f, days: e.target.value as UpcomingEventsFilters['days'] }))}
                  className={inputCls}
                >
                  <option value="7">Next 7 days</option>
                  <option value="15">Next 15 days</option>
                  <option value="30">Next 30 days</option>
                </select>
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Search</span>
                <input
                  value={upcomingEventsFilters.search}
                  onChange={(e) => setUpcomingEventsFilters((f) => ({ ...f, search: e.target.value }))}
                  placeholder="Name, phone, booking id, or event type"
                  className={inputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={upcomingEventsDownloadFormat}
                  onChange={(e) => setUpcomingEventsDownloadFormat(e.target.value as DownloadFormat)}
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

        {activeReport === 'hallOccupancy' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Hall Occupancy Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Select a date range to see booking count, guest totals, and revenue broken down by hall.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Start Date</span>
                <input
                  type="date"
                  value={hallOccupancyFilters.from}
                  onChange={(e) => setHallOccupancyFilters((f) => ({ ...f, from: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">End Date</span>
                <input
                  type="date"
                  value={hallOccupancyFilters.to}
                  onChange={(e) => setHallOccupancyFilters((f) => ({ ...f, to: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={hallOccupancyDownloadFormat}
                  onChange={(e) => setHallOccupancyDownloadFormat(e.target.value as DownloadFormat)}
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
            <QuickDatePresets
              onApply={(range) =>
                setHallOccupancyFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
          </div>
        ) : null}

        {activeReport === 'treasury' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Treasury Ledger Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Filter by date range to see all advance transactions — confirmed, cancelled, dine-in, payouts, next booking, and forfeited amounts.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">From Date</span>
                <input
                  type="date"
                  value={treasuryFilters.from}
                  onChange={(e) => setTreasuryFilters((f) => ({ ...f, from: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">To Date</span>
                <input
                  type="date"
                  value={treasuryFilters.to}
                  onChange={(e) => setTreasuryFilters((f) => ({ ...f, to: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select value={treasuryDownloadFormat} onChange={(e) => setTreasuryDownloadFormat(e.target.value as DownloadFormat)} className={inputCls}>
                  <option value="xlsx">Excel</option>
                  <option value="csv">CSV</option>
                </select>
              </label>
              <div className="flex items-end">
                <button type="button" disabled={activeLoading} onClick={() => void handleViewReport()}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60">
                  {activeLoading ? 'Loading…' : 'View report'}
                </button>
              </div>
              <div className="flex items-end">
                <LoadingButton type="button" disabled={activeDownloading} onClick={() => void handleDownloadReport()} isLoading={activeDownloading}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60">
                  Download report
                </LoadingButton>
              </div>
            </div>
            <QuickDatePresets
              onApply={(range) =>
                setTreasuryFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
          </div>
        ) : null}

        {activeReport === 'repeatCustomers' ? (
          <div className="space-y-5">
            <div>
              <h2 className="text-lg font-semibold text-slate-900">Repeat Customers Filters</h2>
              <p className="mt-1 text-sm text-slate-500">
                Optionally filter by confirmation date range. Leave empty to see all repeat customers ever.
              </p>
            </div>
            <div className="grid gap-4 lg:grid-cols-[1fr_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Confirmed From</span>
                <input
                  type="date"
                  value={repeatCustomersFilters.from}
                  onChange={(e) => setRepeatCustomersFilters((f) => ({ ...f, from: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Confirmed To</span>
                <input
                  type="date"
                  value={repeatCustomersFilters.to}
                  onChange={(e) => setRepeatCustomersFilters((f) => ({ ...f, to: e.target.value }))}
                  className={dateInputCls}
                />
              </label>
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">Download As</span>
                <select
                  value={repeatCustomersDownloadFormat}
                  onChange={(e) => setRepeatCustomersDownloadFormat(e.target.value as DownloadFormat)}
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
            <QuickDatePresets
              onApply={(range) =>
                setRepeatCustomersFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
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
            <QuickDatePresets
              onApply={(range) =>
                setEventPlannerFilters((current) => ({ ...current, from: range.from, to: range.to }))
              }
            />
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

      {activeReport === 'pendingPayments' ? (
        <div className="space-y-4">
          <SummaryTotals rows={pendingPaymentsRows} columns={pendingPaymentsColumns} />
          <DataTable
            rows={pendingPaymentsRows}
            columns={pendingPaymentsColumns}
            emptyMessage="Click 'View report' to load bookings with outstanding balances."
          />
        </div>
      ) : null}

      {activeReport === 'revenue' ? (
        <div className="space-y-4">
          <SummaryTotals rows={revenueRows} columns={revenueColumns} />
          <DataTable
            rows={revenueRows}
            columns={revenueColumns}
            emptyMessage="Set a date range and click 'View report' to generate the revenue breakdown."
          />
        </div>
      ) : null}

      {activeReport === 'upcomingEvents' ? (
        <div className="space-y-4">
          <SummaryTotals rows={upcomingEventsRows} columns={upcomingEventsColumns} />
          <DataTable
            rows={upcomingEventsRows}
            columns={upcomingEventsColumns}
            emptyMessage="Click 'View report' to see upcoming confirmed events."
          />
        </div>
      ) : null}

      {activeReport === 'hallOccupancy' ? (
        <div className="space-y-4">
          <SummaryTotals rows={hallOccupancyRows} columns={hallOccupancyColumns} />
          <DataTable
            rows={hallOccupancyRows}
            columns={hallOccupancyColumns}
            emptyMessage="Set a date range and click 'View report' to see hall-wise occupancy."
          />
        </div>
      ) : null}

      {activeReport === 'repeatCustomers' ? (
        <div className="space-y-4">
          <SummaryTotals rows={repeatCustomersRows} columns={repeatCustomersColumns} />
          <DataTable
            rows={repeatCustomersRows}
            columns={repeatCustomersColumns}
            emptyMessage="Click 'View report' to find customers who have booked more than once."
          />
        </div>
      ) : null}

      {activeReport === 'treasury' && treasuryReport ? (
        <div className="space-y-6">
          {treasuryAdvanceSummary ? (
            <div className="grid grid-cols-2 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {[
                { label: 'Confirmed Advance', value: treasuryAdvanceSummary.confirmedAdvance, color: 'emerald' },
                { label: 'Cancelled Advance', value: treasuryAdvanceSummary.cancelledAdvance, color: 'amber' },
                { label: 'Forfeited Advance', value: treasuryAdvanceSummary.forfeitedAdvance, color: 'red' },
                { label: 'Total Advance', value: treasuryAdvanceSummary.total, color: 'slate' },
              ].map((card) => (
                <div
                  key={card.label}
                  className={`rounded-xl border p-4 ${
                    card.color === 'emerald' ? 'border-emerald-200 bg-emerald-50' :
                    card.color === 'amber' ? 'border-amber-200 bg-amber-50' :
                    card.color === 'red' ? 'border-red-200 bg-red-50' :
                    'border-slate-200 bg-slate-50'
                  }`}
                >
                  <p className="text-xs text-slate-500">{card.label}</p>
                  <p className={`mt-1 text-lg font-bold ${
                    card.color === 'emerald' ? 'text-emerald-700' :
                    card.color === 'amber' ? 'text-amber-700' :
                    card.color === 'red' ? 'text-red-700' :
                    'text-slate-700'
                  }`}>
                    <InrAmount
                      value={card.value}
                      symbolClassName="mr-0.5 align-[0.15em] text-xs font-bold opacity-50"
                    />
                  </p>
                </div>
              ))}
            </div>
          ) : null}

          {/* Summary cards */}
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-5">
            {[
              { label: 'Total Advance Received', value: treasuryReport.summary.totalAdvanceReceived, color: 'emerald' },
              { label: 'Dine-In Used', value: treasuryReport.summary.totalDineInUsed, color: 'amber' },
              { label: 'Payouts', value: treasuryReport.summary.totalPayouts, color: 'blue' },
              { label: 'Next Booking Applied', value: treasuryReport.summary.totalNextBookingApplied, color: 'violet' },
              { label: 'Forfeited Advance', value: treasuryReport.summary.totalForfeited, color: 'red' },
            ].map((card) => (
              <div key={card.label} className={`rounded-xl border p-4 ${
                card.color === 'emerald' ? 'border-emerald-200 bg-emerald-50' :
                card.color === 'amber' ? 'border-amber-200 bg-amber-50' :
                card.color === 'blue' ? 'border-blue-200 bg-blue-50' :
                card.color === 'violet' ? 'border-violet-200 bg-violet-50' :
                'border-red-200 bg-red-50'
              }`}>
                <p className="text-xs text-slate-500">{card.label}</p>
                <p className={`mt-1 text-lg font-bold ${
                  card.color === 'emerald' ? 'text-emerald-700' :
                  card.color === 'amber' ? 'text-amber-700' :
                  card.color === 'blue' ? 'text-blue-700' :
                  card.color === 'violet' ? 'text-violet-700' :
                  'text-red-700'
                }`}>
                  <InrAmount
                    value={card.value}
                    symbolClassName="mr-0.5 align-[0.15em] text-xs font-bold opacity-50"
                  />
                </p>
              </div>
            ))}
          </div>

          {/* Full ledger table */}
          <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead className="border-b border-slate-100 bg-slate-50">
                  <tr>
                    {['Date', 'Type', 'Booking ID', 'Customer', 'Mobile Number', 'Booking Date', 'Cancel Date', 'Amount', 'Mode', 'Note', 'Performed By', 'Running Balance'].map((h) => (
                      <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {treasuryReport.entries.length === 0 ? (
                    <tr>
                      <td colSpan={12} className="px-4 py-8 text-center text-sm text-slate-400">No entries found for the selected date range.</td>
                    </tr>
                  ) : (
                    treasuryReport.entries.map((entry, idx) => {
                      const isDebit = ['DINE_IN_USED', 'PAYOUT_PROCESSED', 'NEXT_BOOKING_APPLIED', 'FORFEITED'].includes(entry.type);
                      const isCredit = entry.type === 'ADVANCE_RECEIVED';
                      return (
                        <tr key={idx} className={`hover:bg-slate-50 ${isDebit ? 'bg-red-50/30' : isCredit ? 'bg-emerald-50/30' : ''}`}>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {formatCsvDateTime(entry.createdAt || entry.date)}
                          </td>
                          <td className="px-4 py-3">
                            <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium ${
                              entry.type === 'ADVANCE_RECEIVED' ? 'bg-emerald-100 text-emerald-700' :
                              entry.type === 'BOOKING_CANCELLED' ? 'bg-slate-100 text-slate-600' :
                              entry.type === 'OPTION_SET' ? 'bg-amber-100 text-amber-700' :
                              entry.type === 'DINE_IN_USED' ? 'bg-orange-100 text-orange-700' :
                              entry.type === 'PAYOUT_PROCESSED' ? 'bg-blue-100 text-blue-700' :
                              entry.type === 'NEXT_BOOKING_APPLIED' ? 'bg-violet-100 text-violet-700' :
                              entry.type === 'FORFEITED' ? 'bg-red-100 text-red-700' :
                              'bg-slate-100 text-slate-600'
                            }`}>
                              {entry.typeLabel}
                            </span>
                          </td>
                          <td className="px-4 py-3 font-mono text-xs text-slate-600">{entry.orderId}</td>
                          <td className="px-4 py-3 text-slate-700">{entry.customerName}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{entry.customerPhone}</td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {entry.bookingDate
                              ? new Date(entry.bookingDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className="px-4 py-3 text-slate-700 whitespace-nowrap">
                            {entry.cancelDate
                              ? new Date(entry.cancelDate).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
                              : '—'}
                          </td>
                          <td className={`px-4 py-3 font-semibold ${isDebit ? 'text-red-600' : isCredit ? 'text-emerald-600' : 'text-slate-700'}`}>
                            {isCredit ? '+' : ''}
                            <InrAmount value={isDebit ? -entry.amount : entry.amount} />
                          </td>
                          <td className="px-4 py-3 text-slate-500">{entry.mode ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-500 max-w-48 truncate">{entry.note ?? '—'}</td>
                          <td className="px-4 py-3 text-slate-600">{entry.performedBy ?? '—'}</td>
                          <td className={`px-4 py-3 font-bold ${entry.runningBalance >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                            <InrAmount value={entry.runningBalance} />
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      ) : null}

      {activeReport === 'treasury' && !treasuryReport ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
          <p className="text-sm text-slate-400">Set a date range and click &apos;View report&apos; to generate the treasury ledger.</p>
        </div>
      ) : null}
    </div>
  );
}

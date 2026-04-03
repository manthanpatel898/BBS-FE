'use client';

import { useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import {
  fetchAdvancePaymentsReport,
  fetchOrderReports,
  fetchOrders,
  fetchSettings,
} from '@/lib/auth/api';
import { AdvancePaymentReportRow, Order, OrderReports } from '@/lib/auth/types';

function formatCurrency(value: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(value);
}

const inputCls =
  'w-full rounded-2xl border border-slate-200 bg-white px-4 py-3 text-sm font-medium text-slate-900 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

const dateInputCls = `${inputCls} [color-scheme:light] [--tw-shadow:0_0_0_1000px_white_inset] [-webkit-text-fill-color:#0f172a] [&::-webkit-datetime-edit]:text-slate-900 [&::-webkit-datetime-edit-fields-wrapper]:text-slate-900 [&::-webkit-datetime-edit-text]:text-slate-500 [&::-webkit-calendar-picker-indicator]:cursor-pointer [&::-webkit-calendar-picker-indicator]:opacity-80`;
const REPORT_FIELDS_STORAGE_KEY = 'banquate_report_fields_v1';
type DownloadFormat = 'csv' | 'xlsx';
const REPORT_FIELDS = [
  { key: 'eventDate', label: 'Function Date' },
  { key: 'inquiryDate', label: 'Inquiry Date' },
  { key: 'confirmedAt', label: 'Confirmed Date' },
  { key: 'serviceSlot', label: 'Slot Type' },
  { key: 'customerName', label: 'Customer Name' },
  { key: 'mobileNo', label: 'Mobile NO' },
  { key: 'eventType', label: 'Event Type' },
  { key: 'hallDetails', label: 'Hall Details' },
  { key: 'packageCategory', label: 'Package Category' },
  { key: 'guests', label: 'Guests' },
  { key: 'grandTotal', label: 'Grand Total' },
  { key: 'advanceAmount', label: 'Advance Amount' },
  { key: 'pendingAmount', label: 'Pending Amount' },
  { key: 'bookedBy', label: 'Booked By' },
] as const;

type ReportFieldKey = (typeof REPORT_FIELDS)[number]['key'];
type AdvancePaymentFilters = {
  from: string;
  to: string;
  paymentMode: string;
  customer: string;
};

function MetricCard({
  label,
  value,
  sub,
}: {
  label: string;
  value: string;
  sub: string;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
        {label}
      </p>
      <p className="mt-3 text-3xl font-bold text-slate-900">{value}</p>
      <p className="mt-2 text-sm text-slate-500">{sub}</p>
    </div>
  );
}

export default function ReportsPage() {
  const { accessToken, user } = useAuth();
  const [reports, setReports] = useState<OrderReports | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [downloadFrom, setDownloadFrom] = useState(() => toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)));
  const [downloadTo, setDownloadTo] = useState(() => toDateInputValue(new Date()));
  const [downloadStatus, setDownloadStatus] = useState('CONFIRMED');
  const [filteredOrders, setFilteredOrders] = useState<Order[]>([]);
  const [showFilteredView, setShowFilteredView] = useState(false);
  const [downloadFormat, setDownloadFormat] = useState<DownloadFormat>('csv');
  const [selectedFields, setSelectedFields] = useState<ReportFieldKey[]>(
    REPORT_FIELDS.map((field) => field.key),
  );
  const [isViewing, setIsViewing] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);
  const [advanceFilters, setAdvanceFilters] = useState<AdvancePaymentFilters>({
    from: toDateInputValue(new Date(new Date().getFullYear(), new Date().getMonth(), 1)),
    to: toDateInputValue(new Date()),
    paymentMode: '',
    customer: '',
  });
  const [advanceRows, setAdvanceRows] = useState<AdvancePaymentReportRow[]>([]);
  const [showAdvanceView, setShowAdvanceView] = useState(false);
  const [paymentModes, setPaymentModes] = useState<string[]>([]);
  const [advanceDownloadFormat, setAdvanceDownloadFormat] =
    useState<DownloadFormat>('csv');
  const [isAdvanceViewing, setIsAdvanceViewing] = useState(false);
  const [isAdvanceDownloading, setIsAdvanceDownloading] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    const storedValue = window.localStorage.getItem(REPORT_FIELDS_STORAGE_KEY);
    if (!storedValue) {
      return;
    }

    try {
      const parsed = JSON.parse(storedValue) as ReportFieldKey[];
      const valid = REPORT_FIELDS.map((field) => field.key).filter((key) =>
        parsed.includes(key),
      );

      if (valid.length > 0) {
        setSelectedFields(valid);
      }
    } catch {
      // Ignore malformed stored preferences.
    }
  }, []);

  useEffect(() => {
    if (typeof window === 'undefined') {
      return;
    }

    window.localStorage.setItem(
      REPORT_FIELDS_STORAGE_KEY,
      JSON.stringify(selectedFields),
    );
  }, [selectedFields]);

  useEffect(() => {
    if (!accessToken || user?.role !== 'company_admin') {
      setLoading(false);
      return;
    }

    const token = accessToken;

    async function loadReports() {
      try {
        setLoading(true);
        setError('');
        const [response, settingsResponse] = await Promise.all([
          fetchOrderReports(token),
          fetchSettings(token).catch(() => null),
        ]);
        setReports(response);
        setPaymentModes(settingsResponse?.paymentOptions.map((option) => option.label) ?? []);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to load reports.',
        );
      } finally {
        setLoading(false);
      }
    }

    void loadReports();
  }, [accessToken, user?.role]);

  if (user?.role !== 'company_admin') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Reports are available for company admin only.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
              Reports
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Booking Reports
            </h1>
            <p className="mt-2 text-sm text-slate-500">
              Track top-selling categories, busy periods, year-on-year performance, month-on-month selling, and best-selling menu items.
            </p>
          </div>
        </div>
        <div className="mt-6 grid gap-4 lg:grid-cols-[1fr_1fr_220px_180px_auto_auto]">
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Start Date
            </span>
            <input
              type="date"
              value={downloadFrom}
              onChange={(event) => setDownloadFrom(event.target.value)}
              className={dateInputCls}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              End Date
            </span>
            <input
              type="date"
              value={downloadTo}
              onChange={(event) => setDownloadTo(event.target.value)}
              className={dateInputCls}
            />
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Status
            </span>
            <select
              value={downloadStatus}
              onChange={(event) => setDownloadStatus(event.target.value)}
              className={inputCls}
            >
              <option value="CONFIRMED">Confirmed</option>
              <option value="INQUIRY">Inquiry</option>
              <option value="CANCELLED">Cancelled</option>
            </select>
          </label>
          <label className="space-y-2">
            <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
              Download As
            </span>
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
              disabled={isViewing}
              onClick={() => void handleViewReport()}
              className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
            >
              {isViewing ? 'Loading…' : 'View report'}
            </button>
          </div>
          <div className="flex items-end">
            <button
              type="button"
              disabled={isDownloading}
              onClick={() => void handleDownloadReport()}
              className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
            >
              {isDownloading ? 'Downloading…' : 'Download report'}
            </button>
          </div>
        </div>
        <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50 p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-semibold text-slate-900">Report Fields</p>
              <p className="mt-1 text-sm text-slate-500">
                Select the fields to include in both the view report and downloaded report.
              </p>
            </div>
            <span className="rounded-full bg-white px-3 py-1 text-xs font-semibold text-slate-600">
              {selectedFields.length} selected
            </span>
          </div>
          <div className="mt-4 grid gap-3 md:grid-cols-2 xl:grid-cols-4">
            {REPORT_FIELDS.map((field) => (
              <label
                key={field.key}
                className="flex items-center gap-3 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-700"
              >
                <input
                  type="checkbox"
                  checked={selectedFields.includes(field.key)}
                  onChange={() => toggleField(field.key)}
                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                />
                <span>{field.label}</span>
              </label>
            ))}
          </div>
        </div>
      </div>

      {loading ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {Array.from({ length: 4 }).map((_, index) => (
            <div
              key={index}
              className="h-36 animate-pulse rounded-2xl border border-slate-200 bg-white shadow-sm"
            />
          ))}
        </div>
      ) : error ? (
        <div className="rounded-2xl border border-red-200 bg-red-50 p-5 text-sm text-red-700 shadow-sm">
          {error}
        </div>
      ) : reports ? (
        <>
          {showFilteredView ? (
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">Filtered Report View</h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Preview bookings for the selected start date, end date, and status.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    {filteredOrders.length} record{filteredOrders.length === 1 ? '' : 's'}
                  </span>
                  <button
                    type="button"
                    onClick={() => setShowFilteredView(false)}
                    className="rounded-xl border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                  >
                    Close
                  </button>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      {selectedFields.map((fieldKey) => (
                        <th key={fieldKey} className="px-4 py-3 font-medium">
                          {getReportFieldLabel(fieldKey)}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {filteredOrders.length > 0 ? (
                      filteredOrders.map((order, index) => (
                        <tr key={order.id} className={index > 0 ? 'border-t border-slate-200' : ''}>
                          {selectedFields.map((fieldKey) => (
                            <td
                              key={`${order.id}-${fieldKey}`}
                              className={`px-4 py-3 ${fieldKey === 'customerName' ? 'font-semibold text-slate-900' : 'text-slate-600'}`}
                            >
                              {getReportFieldValue(order, fieldKey)}
                            </td>
                          ))}
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={Math.max(selectedFields.length, 1)} className="px-4 py-6 text-center text-slate-500">
                          No records found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>
          ) : null}

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <h2 className="text-lg font-semibold text-slate-900">Advance Payment Report</h2>
                <p className="mt-1 text-sm text-slate-500">
                  Filter recorded advance payments by payment date, payment type, and customer, then preview or download the result.
                </p>
              </div>
              <span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                {advanceRows.length} record{advanceRows.length === 1 ? '' : 's'}
              </span>
            </div>
            <div className="mt-4 grid gap-4 lg:grid-cols-[1fr_1fr_220px_1fr_180px_auto_auto]">
              <label className="space-y-2">
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Start Date
                </span>
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
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  End Date
                </span>
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
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Payment Type
                </span>
                <select
                  value={advanceFilters.paymentMode}
                  onChange={(event) =>
                    setAdvanceFilters((current) => ({
                      ...current,
                      paymentMode: event.target.value,
                    }))
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
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Customer
                </span>
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
                <span className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                  Download As
                </span>
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
                  disabled={isAdvanceViewing}
                  onClick={() => void handleViewAdvanceReport()}
                  className="inline-flex w-full items-center justify-center rounded-2xl border border-slate-300 bg-white px-5 py-3 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60"
                >
                  {isAdvanceViewing ? 'Loading…' : 'View report'}
                </button>
              </div>
              <div className="flex items-end">
                <button
                  type="button"
                  disabled={isAdvanceDownloading}
                  onClick={() => void handleDownloadAdvanceReport()}
                  className="inline-flex w-full items-center justify-center rounded-2xl bg-amber-400 px-5 py-3 text-sm font-semibold text-white transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {isAdvanceDownloading ? 'Downloading…' : 'Download report'}
                </button>
              </div>
            </div>

            {showAdvanceView ? (
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Payment Date</th>
                      <th className="px-4 py-3 font-medium">Booking Id</th>
                      <th className="px-4 py-3 font-medium">Customer</th>
                      <th className="px-4 py-3 font-medium">Phone</th>
                      <th className="px-4 py-3 font-medium">Payment Type</th>
                      <th className="px-4 py-3 font-medium">Amount</th>
                      <th className="px-4 py-3 font-medium">Event</th>
                      <th className="px-4 py-3 font-medium">Recorded By</th>
                    </tr>
                  </thead>
                  <tbody>
                    {advanceRows.length > 0 ? (
                      advanceRows.map((row, index) => (
                        <tr
                          key={`${row.orderId}-${row.paymentDate}-${index}`}
                          className={index > 0 ? 'border-t border-slate-200' : ''}
                        >
                          <td className="px-4 py-3 text-slate-600">
                            {formatCsvDateTime(row.paymentDate)}
                          </td>
                          <td className="px-4 py-3 font-semibold text-slate-900">{row.orderId}</td>
                          <td className="px-4 py-3 text-slate-600">{row.customerName}</td>
                          <td className="px-4 py-3 text-slate-600">{row.customerPhone || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{row.paymentMode}</td>
                          <td className="px-4 py-3 text-slate-600">{formatCurrency(row.amount)}</td>
                          <td className="px-4 py-3 text-slate-600">{row.eventType || '-'}</td>
                          <td className="px-4 py-3 text-slate-600">{row.recordedByName}</td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={8} className="px-4 py-6 text-center text-slate-500">
                          No advance payments found for the selected filters.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            ) : null}
          </section>

          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <MetricCard
              label="Highest Selling Category"
              value={reports.highestSellingCategories[0]?.name || 'No data'}
              sub={
                reports.highestSellingCategories[0]
                  ? `${reports.highestSellingCategories[0].bookings} bookings`
                  : 'No sold categories yet'
              }
            />
            <MetricCard
              label="Busy Month In A Year"
              value={reports.busiestMonth.label}
              sub={`${reports.busiestMonth.bookings} bookings`}
            />
            <MetricCard
              label="Current Year Selling"
              value={formatCurrency(reports.yearComparison.current.revenue)}
              sub={`${reports.yearComparison.current.bookings} confirmed bookings`}
            />
            <MetricCard
              label="Current Month Selling"
              value={formatCurrency(reports.monthComparison.current.revenue)}
              sub={`${reports.monthComparison.current.bookings} confirmed bookings`}
            />
          </div>

          <div className="grid gap-4 xl:grid-cols-[1.15fr_0.85fr]">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h2 className="text-lg font-semibold text-slate-900">
                    Highest Category Selling
                  </h2>
                  <p className="mt-1 text-sm text-slate-500">
                    Categories performing best by sold booking count.
                  </p>
                </div>
              </div>
              <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
                <table className="min-w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-500">
                    <tr>
                      <th className="px-4 py-3 font-medium">Category</th>
                      <th className="px-4 py-3 font-medium">Bookings</th>
                      <th className="px-4 py-3 font-medium">Selling</th>
                    </tr>
                  </thead>
                  <tbody>
                    {reports.highestSellingCategories.length > 0 ? (
                      reports.highestSellingCategories.map((category, index) => (
                        <tr key={category.name} className={index > 0 ? 'border-t border-slate-200' : ''}>
                          <td className="px-4 py-3 font-semibold text-slate-900">
                            {category.name}
                          </td>
                          <td className="px-4 py-3 text-slate-600">{category.bookings}</td>
                          <td className="px-4 py-3 text-slate-600">
                            {formatCurrency(category.revenue)}
                          </td>
                        </tr>
                      ))
                    ) : (
                      <tr>
                        <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                          No category sales available.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">Busy Month In A Year</h2>
              <p className="mt-1 text-sm text-slate-500">
                Busiest month from the current year&apos;s sold bookings.
              </p>
              <div className="mt-4 rounded-2xl border border-amber-200 bg-gradient-to-br from-amber-50 via-white to-orange-50 p-5">
                <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-700">
                  {reports.busiestMonth.label}
                </p>
                <p className="mt-3 text-3xl font-bold text-slate-900">
                  {reports.busiestMonth.bookings}
                </p>
                <p className="mt-1 text-sm text-slate-600">Bookings in that month</p>
                <p className="mt-4 text-lg font-semibold text-slate-900">
                  {formatCurrency(reports.busiestMonth.revenue)}
                </p>
                <p className="text-sm text-slate-500">Total selling</p>
              </div>
            </section>
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Current Year vs Previous Year
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[reports.yearComparison.current, reports.yearComparison.previous].map((entry) => (
                  <div key={entry.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {entry.label}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {formatCurrency(entry.revenue)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{entry.bookings} bookings</p>
                  </div>
                ))}
              </div>
            </section>

            <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
              <h2 className="text-lg font-semibold text-slate-900">
                Current Month vs Previous Month
              </h2>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                {[reports.monthComparison.current, reports.monthComparison.previous].map((entry) => (
                  <div key={entry.label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-[0.25em] text-slate-500">
                      {entry.label}
                    </p>
                    <p className="mt-3 text-2xl font-bold text-slate-900">
                      {formatCurrency(entry.revenue)}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">{entry.bookings} bookings</p>
                  </div>
                ))}
              </div>
            </section>
          </div>

          <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
            <h2 className="text-lg font-semibold text-slate-900">
              Best Selling Menu Items
            </h2>
            <p className="mt-1 text-sm text-slate-500">
              Menu items selected most often across confirmed bookings.
            </p>
            <div className="mt-4 overflow-x-auto rounded-2xl border border-slate-200">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-slate-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Menu Item</th>
                    <th className="px-4 py-3 font-medium">Category</th>
                    <th className="px-4 py-3 font-medium">Selections</th>
                  </tr>
                </thead>
                <tbody>
                  {reports.bestSellingMenuItems.length > 0 ? (
                    reports.bestSellingMenuItems.map((item, index) => (
                      <tr key={item.name} className={index > 0 ? 'border-t border-slate-200' : ''}>
                        <td className="px-4 py-3 font-semibold text-slate-900">{item.name}</td>
                        <td className="px-4 py-3 text-slate-600">
                          {item.categories.join(', ')}
                        </td>
                        <td className="px-4 py-3 text-slate-600">{item.count}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={3} className="px-4 py-6 text-center text-slate-500">
                        No menu item sales available.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

        </>
      ) : null}
    </div>
  );

  async function loadFilteredOrders() {
    if (!accessToken) {
      throw new Error('Missing session token.');
    }

    validateDateRange(downloadFrom, downloadTo);

    const allOrders: Order[] = [];
    let nextPage = 1;
    let totalPages = 1;

    do {
      const response = await fetchOrders(accessToken, {
        page: nextPage,
        limit: 100,
        search: '',
        status: downloadStatus,
        from: downloadFrom,
        to: downloadTo,
      });

      allOrders.push(...response.items);
      totalPages = response.pagination.totalPages;
      nextPage += 1;
    } while (nextPage <= totalPages);

    return allOrders;
  }

  async function loadAdvancePaymentRows() {
    if (!accessToken) {
      throw new Error('Missing session token.');
    }

    validateDateRange(advanceFilters.from, advanceFilters.to);

    return fetchAdvancePaymentsReport(accessToken, advanceFilters);
  }

  async function handleViewReport() {
    if (selectedFields.length === 0) {
      setError('Select at least one report field.');
      return;
    }

    try {
      setIsViewing(true);
      setError('');
      const orders = await loadFilteredOrders();
      setFilteredOrders(orders);
      setShowFilteredView(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to view report.',
      );
    } finally {
      setIsViewing(false);
    }
  }

  async function handleDownloadReport() {
    if (selectedFields.length === 0) {
      setError('Select at least one report field.');
      return;
    }

    try {
      setIsDownloading(true);
      setError('');
      const allOrders = await loadFilteredOrders();
      setFilteredOrders(allOrders);

      const headers = selectedFields.map((fieldKey) => getReportFieldLabel(fieldKey));
      const rows = allOrders.map((order) =>
        selectedFields.map((fieldKey) => getReportExportValue(order, fieldKey)),
      );

      await downloadTable(
        headers,
        rows,
        `booking-report-${downloadStatus.toLowerCase()}-${downloadFrom}-to-${downloadTo}`,
        downloadFormat,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to download report.',
      );
    } finally {
      setIsDownloading(false);
    }
  }

  async function handleViewAdvanceReport() {
    try {
      setIsAdvanceViewing(true);
      setError('');
      const rows = await loadAdvancePaymentRows();
      setAdvanceRows(rows);
      setShowAdvanceView(true);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to view advance payment report.',
      );
    } finally {
      setIsAdvanceViewing(false);
    }
  }

  async function handleDownloadAdvanceReport() {
    try {
      setIsAdvanceDownloading(true);
      setError('');
      const rows = await loadAdvancePaymentRows();
      setAdvanceRows(rows);

      await downloadTable(
        [
          'Payment Date',
          'Booking Id',
          'Customer Name',
          'Customer Phone',
          'Payment Type',
          'Amount',
          'Event Type',
          'Function Date',
          'Recorded By',
          'Remarks',
        ],
        rows.map((row) => [
          formatCsvDateTime(row.paymentDate),
          row.orderId,
          row.customerName,
          row.customerPhone || '',
          row.paymentMode,
          formatExportAmount(row.amount),
          row.eventType || '',
          formatCsvDate(row.functionDate),
          row.recordedByName,
          row.remark || '',
        ]),
        `advance-payments-report-${advanceFilters.from}-to-${advanceFilters.to}`,
        advanceDownloadFormat,
      );
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to download advance payment report.',
      );
    } finally {
      setIsAdvanceDownloading(false);
    }
  }

  function toggleField(fieldKey: ReportFieldKey) {
    setSelectedFields((current) =>
      current.includes(fieldKey)
        ? current.filter((item) => item !== fieldKey)
        : REPORT_FIELDS.map((field) => field.key).filter(
            (item) => item === fieldKey || current.includes(item),
          ),
    );
  }
}

function escapeCsvValue(value: string | number | null) {
  const stringValue = String(value ?? '');
  return `"${stringValue.replace(/"/g, '""')}"`;
}

function formatCsvDate(value: string | null) {
  return value ? new Date(value).toLocaleDateString('en-IN') : '';
}

function formatTime12Hour(value: string | null) {
  if (!value) {
    return '';
  }

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

  if (date && time) {
    return `${date} ${time}`;
  }

  return date || time || '';
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

function getReportFieldLabel(fieldKey: ReportFieldKey) {
  return REPORT_FIELDS.find((field) => field.key === fieldKey)?.label ?? fieldKey;
}

function getReportFieldValue(order: Order, fieldKey: ReportFieldKey) {
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
      return order.pax ?? '-';
    case 'grandTotal':
      return formatCurrency(order.grandTotal);
    case 'advanceAmount':
      return formatCurrency(order.advanceAmount);
    case 'pendingAmount':
      return formatCurrency(order.pendingAmount);
    case 'bookedBy':
      return order.bookingTakenBy || '-';
    default:
      return '-';
  }
}

function getReportExportValue(order: Order, fieldKey: ReportFieldKey) {
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
      return getReportFieldValue(order, fieldKey);
  }
}

function formatExportAmount(value: number) {
  return Number.isInteger(value) ? String(value) : value.toFixed(2);
}

function validateDateRange(from: string, to: string) {
  if (!from || !to) {
    throw new Error('Start date and end date are required.');
  }

  if (from > to) {
    throw new Error('Start date cannot be later than end date.');
  }
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

function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

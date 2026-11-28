'use client';

import Link from 'next/link';
import { useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { fetchSettlementDiscountReport } from '@/lib/auth/api';
import type { SettlementDiscountReport } from '@/lib/auth/types';
import { escapeCsvValue } from '@/lib/excel';

const currency = (amount: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(amount);
const date = (value: string | null, time = false) => value ? new Intl.DateTimeFormat('en-IN', {
  timeZone: 'Asia/Kolkata', dateStyle: 'medium', ...(time ? { timeStyle: 'short' as const } : {}),
}).format(new Date(value)) : '—';

export default function SettlementDiscountReportPage() {
  const { user, accessToken } = useAuth();
  const [from, setFrom] = useState('');
  const [to, setTo] = useState('');
  const [report, setReport] = useState<SettlementDiscountReport | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const allowed = user?.businessType !== 'EVENT_DECORATION' && hasPermission(user, PERMISSIONS.REPORTS_BOOKING_VIEW);

  async function generate() {
    if (!accessToken || !allowed) return;
    setError('');
    if (from && to && from > to) { setError('End date must be on or after start date.'); return; }
    setBusy(true);
    try { setReport(await fetchSettlementDiscountReport(accessToken, { from: from || undefined, to: to || undefined })); }
    catch (cause) { setError(cause instanceof Error ? cause.message : 'Unable to load settlement discounts.'); }
    finally { setBusy(false); }
  }

  function exportCsv() {
    if (!report) return;
    const values = [
      ['Booking', 'Customer', 'Event Date', 'Adjustment Date (Asia/Kolkata)', 'Settlement Discount', 'Reason', 'Recorded By'],
      ...report.rows.map((row) => [row.orderId, row.customerName, date(row.eventDate), date(row.recordedAt, true), row.amount, row.reason, row.recordedByName]),
      ['TOTAL', '', '', '', report.totalAmount, '', ''],
    ];
    const blob = new Blob(['\uFEFF' + values.map((row) => row.map(escapeCsvValue).join(',')).join('\r\n')], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = 'settlement-discounts.csv'; anchor.click(); URL.revokeObjectURL(url);
  }

  if (!allowed) return <main className="p-6"><p>You do not have permission to view this report.</p></main>;

  return <main className="space-y-6 p-4 sm:p-6">
    <Link href="/reports" className="text-sm font-semibold text-amber-700">← All reports</Link>
    <header><h1 className="text-2xl font-bold text-slate-950">Settlement Discounts</h1><p className="mt-2 text-sm text-slate-600">Adjustments by date recorded in Asia/Kolkata. Historical discounts remain available after the add-on is disabled.</p></header>
    <form onSubmit={(event) => { event.preventDefault(); void generate(); }} className="flex flex-wrap items-end gap-4 rounded-2xl border border-slate-200 bg-white p-5">
      <label className="grid gap-2 text-sm font-semibold">Adjustment date from<input type="date" value={from} onChange={(event) => setFrom(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" /></label>
      <label className="grid gap-2 text-sm font-semibold">Adjustment date to<input type="date" value={to} onChange={(event) => setTo(event.target.value)} className="rounded-xl border border-slate-300 px-3 py-2" /></label>
      <button disabled={busy} className="rounded-xl bg-amber-600 px-4 py-2 font-semibold text-white disabled:opacity-50">{busy ? 'Loading…' : 'Generate report'}</button>
      <button type="button" onClick={exportCsv} disabled={!report || busy} className="rounded-xl border border-slate-300 px-4 py-2 font-semibold disabled:opacity-50">Export CSV</button>
    </form>
    {error ? <p role="alert" className="text-sm text-red-700">{error}</p> : null}
    {report ? <>
      <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5"><p className="text-sm font-semibold text-amber-800">Total settlement discounts · {report.rows.length} adjustments</p><p className="mt-2 text-2xl font-bold">{currency(report.totalAmount)}</p></div>
      {!report.rows.length ? <p className="rounded-2xl bg-white p-6 text-slate-600">No settlement discounts found for this adjustment date range.</p> : <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white"><table className="min-w-full text-left text-sm"><thead className="bg-slate-50"><tr>{['Booking', 'Customer', 'Event date', 'Adjustment date', 'Discount', 'Reason', 'Recorded by'].map((label) => <th key={label} className="px-4 py-3">{label}</th>)}</tr></thead><tbody>{report.rows.map((row, index) => <tr key={`${row.orderId}-${row.recordedAt}-${index}`} className="border-t border-slate-100"><td className="whitespace-nowrap px-4 py-3">{row.orderId}</td><td className="px-4 py-3">{row.customerName}</td><td className="whitespace-nowrap px-4 py-3">{date(row.eventDate)}</td><td className="whitespace-nowrap px-4 py-3">{date(row.recordedAt, true)}</td><td className="whitespace-nowrap px-4 py-3 font-semibold">{currency(row.amount)}</td><td className="min-w-56 whitespace-pre-wrap px-4 py-3">{row.reason}</td><td className="px-4 py-3">{row.recordedByName}</td></tr>)}</tbody></table></div>}
    </> : <p className="text-sm text-slate-500">Generate the report to view settlement adjustments.</p>}
  </main>;
}

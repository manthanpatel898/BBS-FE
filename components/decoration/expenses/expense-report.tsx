'use client';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { fetchExpenseReport, fetchExpenseTypes } from '@/lib/decoration/expenses/api';
import { EXPENSE_MODES, ExpenseFilters, ExpenseReport, ExpenseType, indiaToday, money } from '@/lib/decoration/expenses/domain';
import { createExcelBlobFromTable } from '@/lib/excel';
import { ExpenseEventPicker } from './event-picker';
import { ExpenseTable, expenseInputClass, saveExpenseBlob } from './shared';
const initialFilters = (): ExpenseFilters => ({ dateFrom: `${indiaToday().slice(0, 7)}-01`, dateTo: indiaToday(), bookingId: '', typeId: '', mode: '', page: 1 });
export function DecorationExpenseReport() {
  const { accessToken, user } = useAuth();
  const allowed = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_EXPENSES_VIEW);
  const canExport = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_REPORTS_EXPORT);
  const canAccount = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_ACCOUNTS_VIEW);
  const [draft, setDraft] = useState(initialFilters), [filters, setFilters] = useState(initialFilters), [report, setReport] = useState<ExpenseReport | null>(null), [types, setTypes] = useState<ExpenseType[]>([]), [loading, setLoading] = useState(true), [exporting, setExporting] = useState(false), [error, setError] = useState('');
  const latestLoad = useRef(0);
  const load = useCallback(async () => {
    if (!accessToken || !allowed) return;
    const requestId = ++latestLoad.current;
    setLoading(true); setError(''); setReport(null);
    try { const [result, available] = await Promise.all([fetchExpenseReport(accessToken, filters), fetchExpenseTypes(accessToken)]); if (requestId !== latestLoad.current) return; setReport(result); setTypes(available); }
    catch (reason) { if (requestId !== latestLoad.current) return; setError(reason instanceof Error ? reason.message : 'Unable to load expense report.'); }
    finally { if (requestId === latestLoad.current) setLoading(false); }
  }, [accessToken, allowed, filters]);
  useEffect(() => { void load(); return () => { latestLoad.current += 1; }; }, [load]);
  function generate(event: FormEvent) { event.preventDefault(); if (draft.dateFrom && draft.dateTo && draft.dateFrom > draft.dateTo) { setError('Start date must be before end date.'); return; } setFilters({ ...draft, page: 1 }); }
  async function download() {
    if (!accessToken) return; setExporting(true); setError('');
    try {
      const all = await fetchExpenseReport(accessToken, filters, true);
      const blob = await createExcelBlobFromTable('Paid expenses', ['Paid date', 'Booking number', 'Event', 'Expense type', 'Method', 'Input value', 'Recorded price basis', 'Paid amount', 'Payment mode', 'Remark', 'Recorded by', 'Last edited by'], all.items.map((row) => [row.paidDate, row.event?.bookingNumber ?? '', row.event?.functionName ?? '', row.typeName, row.kind, row.value, row.baseAmount, row.amount, row.mode, row.remark, row.recordedBy, row.updatedBy]), {
        headerInfo: { reportName: 'Event Company · Paid Expense Report', dateRange: `${filters.dateFrom || 'All dates'} to ${filters.dateTo || 'All dates'}` },
        footerSections: [{ title: 'Summary', rows: [{ label: 'Total paid expenses', value: all.total }, { label: 'Number of expenses', value: all.count }] }, { title: 'Daily totals', rows: all.daily.map((day) => ({ label: day._id, value: day.total })) }, { title: 'Event totals', rows: all.byEvent.map((event) => ({ label: `${event.event?.bookingNumber ?? 'Event unavailable'} · ${event.event?.functionName ?? ''}`, value: event.total })) }],
      });
      saveExpenseBlob(blob, 'event-paid-expenses.xlsx');
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to export expenses.'); }
    finally { setExporting(false); }
  }
  if (!allowed) return <p>You do not have permission to view expense reports.</p>;
  return <div className="event-finance finance-report space-y-5 text-slate-900"><Link href="/decoration/reports/" className="text-sm font-semibold text-amber-800">← All reports</Link><header><p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Event Company · Internal Financial Report</p><h1 className="mt-2 break-words text-2xl font-bold tabular-nums">Expense Report</h1><p className="mt-2 text-sm text-slate-600">Paid expenses across your events. Date filters use the expense payment date, including spending before or after an event.</p></header>
    <form onSubmit={generate} className="space-y-4 rounded-2xl border border-slate-200 bg-white p-5"><div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"><label className="text-sm font-medium">Paid from<input type="date" value={draft.dateFrom} onChange={(event) => setDraft({ ...draft, dateFrom: event.target.value })} className={expenseInputClass} /></label><label className="text-sm font-medium">Paid through<input type="date" value={draft.dateTo} onChange={(event) => setDraft({ ...draft, dateTo: event.target.value })} className={expenseInputClass} /></label><label className="text-sm font-medium">Expense type<select value={draft.typeId} onChange={(event) => setDraft({ ...draft, typeId: event.target.value })} className={expenseInputClass}><option value="">All types</option>{types.map((type) => <option key={type.id} value={type.id}>{type.name}{type.isActive ? '' : ' (inactive)'}</option>)}</select></label><label className="text-sm font-medium">Payment mode<select value={draft.mode} onChange={(event) => setDraft({ ...draft, mode: event.target.value })} className={expenseInputClass}><option value="">All modes</option>{EXPENSE_MODES.map((mode) => <option key={mode} value={mode}>{mode.replaceAll('_', ' ')}</option>)}</select></label>{accessToken && <ExpenseEventPicker token={accessToken} value={draft.bookingId} onChange={(id) => setDraft({ ...draft, bookingId: id })} optional />}</div><div className="finance-report-actions"><button disabled={loading} className="min-h-11 rounded-xl bg-amber-500 px-4 text-sm font-bold disabled:opacity-50">Apply filters</button>{canExport && <button type="button" onClick={() => void download()} disabled={loading || exporting || !report?.count} className="min-h-11 rounded-xl border border-slate-300 px-4 text-sm font-semibold disabled:opacity-50">{exporting ? 'Exporting…' : 'Export Excel'}</button>}</div></form>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={() => void load()} className="underline">Retry</button></p>}
    {loading ? <p role="status">Loading expense report…</p> : report && <><div className="grid gap-4 sm:grid-cols-2"><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">Total paid expenses · all matching records</p><p className="mt-2 break-words text-2xl font-bold tabular-nums">{money(report.total)}</p></div><div className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">Expense entries</p><p className="mt-2 break-words text-2xl font-bold tabular-nums">{report.count}</p></div></div><ExpenseTable rows={report.items} showEvent /><div className="flex items-center justify-between text-sm"><button disabled={filters.page <= 1} onClick={() => setFilters({ ...filters, page: filters.page - 1 })} className="min-h-11 px-3 disabled:opacity-40">Previous</button><span>Page {report.page} of {Math.max(1, report.totalPages)}</span><button disabled={filters.page >= report.totalPages} onClick={() => setFilters({ ...filters, page: filters.page + 1 })} className="min-h-11 px-3 disabled:opacity-40">Next</button></div><div className="finance-report-groups"><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Daily totals</h2>{!report.daily.length && <p className="mt-3 text-sm text-slate-500">No expenses in this period.</p>}<div className="mt-3 max-h-80 overflow-y-auto">{report.daily.map((day) => <div key={day._id} className="finance-report-group-row"><span>{day._id} · {day.count} entries</span><strong>{money(day.total)}</strong></div>)}</div></section><section className="rounded-2xl border border-slate-200 bg-white p-5"><h2 className="font-bold">Event totals</h2><div className="mt-3 max-h-80 overflow-y-auto">{report.byEvent.map((event) => <div key={event._id} className="finance-report-group-row"><div>{canAccount ? <Link href={`/decoration/reports/accounts/?event=${event._id}`} className="font-semibold text-amber-800">{event.event?.bookingNumber ?? 'Event unavailable'}</Link> : event.event?.bookingNumber ?? 'Event unavailable'}<p className="text-xs text-slate-500">{event.event?.functionName} · {event.count} entries</p></div><strong>{money(event.total)}</strong></div>)}</div></section></div></>}
  </div>;
}

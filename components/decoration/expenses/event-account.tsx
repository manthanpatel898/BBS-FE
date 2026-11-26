'use client';
import Link from 'next/link';
import { useEffect, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { fetchEventAccount } from '@/lib/decoration/expenses/api';
import { EventAccount, money } from '@/lib/decoration/expenses/domain';
import { createExcelBlobFromTable } from '@/lib/excel';
import { ExpenseEventPicker } from './event-picker';
import { ExpenseTable, saveExpenseBlob } from './shared';
export function DecorationEventAccount() {
  const { accessToken, user } = useAuth(), params = useSearchParams();
  const allowed = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_ACCOUNTS_VIEW);
  const canExport = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_REPORTS_EXPORT);
  const [id, setId] = useState(params.get('event') ?? ''), [account, setAccount] = useState<EventAccount | null>(null), [loading, setLoading] = useState(false), [error, setError] = useState(''), [exporting, setExporting] = useState(false), [reload, setReload] = useState(0);
  useEffect(() => { setId(params.get('event') ?? ''); }, [params]);
  useEffect(() => {
    let cancelled = false; setAccount(null); setError(''); setLoading(false);
    if (!accessToken || !allowed || !id) return;
    setLoading(true);
    void fetchEventAccount(accessToken, id).then((result) => { if (!cancelled) setAccount(result); }).catch((reason) => { if (!cancelled) setError(reason instanceof Error ? reason.message : 'Unable to load account statement.'); }).finally(() => { if (!cancelled) setLoading(false); });
    return () => { cancelled = true; };
  }, [accessToken, allowed, id, reload]);
  async function download() {
    if (!accessToken || !id) return; setExporting(true); setError('');
    try {
      const data = await fetchEventAccount(accessToken, id, true);
      const rows: Array<Array<string | number | null>> = [
        ...data.payments.map((payment) => [String(payment.date).slice(0, 10), 'Customer payment', '', null, null, payment.amount, null, payment.mode, payment.remark, payment.recordedBy]),
        ...data.expenses.map((expense) => [expense.paidDate, 'Paid expense', expense.typeName, expense.kind === 'PERCENTAGE' ? expense.value : null, expense.baseAmount, null, expense.amount, expense.mode, expense.remark, expense.recordedBy]),
      ];
      rows.sort((left, right) => String(left[0]).localeCompare(String(right[0])));
      saveExpenseBlob(await createExcelBlobFromTable('Event account', ['Date', 'Activity', 'Expense type', 'Percentage', 'Recorded price basis', 'Customer payment', 'Paid expense', 'Payment mode', 'Remark', 'Recorded by'], rows, {
        headerInfo: { reportName: `Event Account · ${data.event.bookingNumber} · ${data.event.customerName}`, dateRange: `${data.event.functionName} · ${String(data.event.eventDate).slice(0, 10)} · ${data.event.venueName} · ${data.event.status}` },
        footerSections: [{ title: 'Event account summary', rows: [
          { label: 'Finalized event price', value: data.totals.finalizedPrice ?? 'Not finalized' }, { label: 'Customer payments received', value: data.totals.received }, { label: 'Customer balance pending', value: data.totals.outstanding ?? 'Not finalized' }, { label: 'Total paid expenses', value: data.totals.totalExpenses }, { label: 'Event margin (price less recorded expenses)', value: data.totals.margin ?? 'Not finalized' }, { label: 'Received minus paid expenses', value: data.totals.receivedLessExpenses },
        ] }],
      }), `event-account-${data.event.bookingNumber}.xlsx`);
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to export account statement.'); }
    finally { setExporting(false); }
  }
  if (!allowed) return <p>You do not have permission to view event account statements.</p>;
  return <div className="space-y-6 text-slate-900"><Link href="/decoration/reports/" className="text-sm font-semibold text-amber-800">← All reports</Link><header><p className="text-xs font-semibold uppercase tracking-widest text-amber-700">Event Company · Internal Financial Report</p><h1 className="mt-2 text-2xl font-bold">Event Account Statement</h1><p className="mt-2 text-sm text-slate-600">Customer collections and paid expenses for one event.</p></header><section className="max-w-2xl rounded-2xl border border-slate-200 bg-white p-5">{accessToken && <ExpenseEventPicker token={accessToken} value={id} onChange={setId} />}</section>
    {error && <p role="alert" className="rounded-xl bg-red-50 p-4 text-sm text-red-700">{error} <button onClick={() => setReload(reload + 1)} className="underline">Retry</button></p>}
    {loading ? <p role="status">Loading event account…</p> : !id ? <p className="text-sm text-slate-600">Select an event to view its account statement.</p> : account && <>
      <section className="flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-5"><div><h2 className="text-xl font-bold">{account.event.bookingNumber} · {account.event.customerName}</h2><p className="mt-1 text-sm text-slate-600">{account.event.functionName} · {String(account.event.eventDate).slice(0, 10)} · {account.event.venueName}</p><p className="mt-1 text-xs text-slate-500">{account.event.status.replaceAll('_', ' ')}</p></div>{canExport && <button disabled={exporting} onClick={() => void download()} className="min-h-11 rounded-xl bg-amber-500 px-4 text-sm font-bold disabled:opacity-50">{exporting ? 'Exporting…' : 'Export Excel'}</button>}</section>
      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">{[
        ['Finalized event price', account.totals.finalizedPrice], ['Customer payments received', account.totals.received], ['Customer balance pending', account.totals.outstanding], ['Total paid expenses', account.totals.totalExpenses], ['Event margin', account.totals.margin], ['Received minus expenses', account.totals.receivedLessExpenses],
      ].map(([label, amount]) => <div key={String(label)} className="rounded-2xl border border-slate-200 bg-white p-5"><p className="text-sm text-slate-600">{label}</p><p className="mt-2 text-xl font-bold">{money(amount as number | null)}</p></div>)}</div>
      <p className="text-xs leading-5 text-slate-500">Event margin is finalized event price minus recorded paid expenses. It depends on all expenses being entered. Received minus expenses shows collections less recorded spending; unpaid customer balances remain separate.</p>
      <section className="space-y-3"><h2 className="text-lg font-bold">Customer Payment History</h2>{!account.payments.length ? <p className="rounded-xl bg-slate-50 p-5 text-sm text-slate-600">No customer payments recorded.</p> : <div className="overflow-x-auto rounded-xl border border-slate-200"><table className="w-full min-w-[600px] text-left text-sm"><thead className="bg-slate-50 text-slate-500"><tr>{['Date', 'Received', 'Mode', 'Remark', 'Recorded by'].map((label) => <th key={label} className="p-3">{label}</th>)}</tr></thead><tbody>{account.payments.map((payment) => <tr key={payment.id} className="border-t border-slate-100"><td className="p-3">{String(payment.date).slice(0, 10)}</td><td className="p-3 font-semibold text-emerald-700">{money(payment.amount)}</td><td className="p-3">{payment.mode.replaceAll('_', ' ')}</td><td className="p-3">{payment.remark || '—'}</td><td className="p-3">{payment.recordedBy}</td></tr>)}</tbody></table></div>}</section>
      <section className="space-y-3"><h2 className="text-lg font-bold">Paid Expense History</h2><ExpenseTable rows={account.expenses} /></section>
    </>}
  </div>;
}

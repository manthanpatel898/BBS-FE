'use client';
import Link from 'next/link';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { DecorationBooking } from '@/lib/auth/types';
import { fetchEventExpenses, fetchExpenseTypes, saveEventExpense } from '@/lib/decoration/expenses/api';
import { EXPENSE_MODES, ExpenseType, PaidExpense, indiaToday, money, previewExpense } from '@/lib/decoration/expenses/domain';
import { ExpenseTable, expenseInputClass } from './shared';

export function EventExpenses({ booking }: { booking: DecorationBooking }) {
  const { accessToken, user } = useAuth();
  const canView = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_EXPENSES_VIEW) || hasPermission(user, PERMISSIONS.DECORATION_EXPENSES_MANAGE);
  const canManage = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_EXPENSES_MANAGE);
  const canAccount = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_ACCOUNTS_VIEW);
  const [rows, setRows] = useState<PaidExpense[]>([]), [types, setTypes] = useState<ExpenseType[]>([]), [loading, setLoading] = useState(true), [error, setError] = useState(''), [saving, setSaving] = useState(false);
  const [recalculate, setRecalculate] = useState(false);
  const [open, setOpen] = useState(false), [editing, setEditing] = useState<PaidExpense | undefined>(), [typeId, setTypeId] = useState(''), [value, setValue] = useState(''), [paidDate, setPaidDate] = useState(indiaToday), [mode, setMode] = useState('CASH'), [remark, setRemark] = useState('');
  const latestLoad = useRef(0);
  const load = useCallback(async () => {
    if (!accessToken || !canView) return;
    const requestId = ++latestLoad.current;
    setLoading(true);
    try { const [entries, available] = await Promise.all([fetchEventExpenses(accessToken, booking.id), fetchExpenseTypes(accessToken)]); if (requestId !== latestLoad.current) return; setRows(entries); setTypes(available); setError(''); }
    catch (reason) { if (requestId !== latestLoad.current) return; setError(reason instanceof Error ? reason.message : 'Unable to load expenses.'); }
    finally { if (requestId === latestLoad.current) setLoading(false); }
  }, [accessToken, canView, booking.id]);
  useEffect(() => { void load(); return () => { latestLoad.current += 1; }; }, [load]);
  const selected = types.find((type) => type.id === typeId);
  const sameType = editing?.typeId === typeId;
  const kind = sameType ? editing.kind : selected?.kind ?? 'RUPEES';
  const amount = previewExpense(kind, value, booking.packageRate, booking.isPackagePriceFinalized, sameType && !recalculate ? editing.baseAmount : undefined);
  function edit(entry?: PaidExpense) {
    setEditing(entry); setRecalculate(false); setTypeId(entry?.typeId ?? types.find((type) => type.isActive)?.id ?? ''); setValue(entry ? String(entry.value) : ''); setPaidDate(entry?.paidDate ?? indiaToday()); setMode(entry?.mode ?? 'CASH'); setRemark(entry?.remark ?? ''); setOpen(true); setError('');
  }
  async function submit(event: FormEvent) {
    event.preventDefault(); if (!accessToken || !typeId || amount === null || amount < 0.01) return;
    setSaving(true); setError('');
    try { await saveEventExpense(accessToken, booking.id, { typeId, value: Number(value), paidDate, mode, remark }, editing, recalculate); setOpen(false); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save expense.'); }
    finally { setSaving(false); }
  }
  if (!canView) return canAccount ? <Link href={`/decoration/reports/accounts/?event=${booking.id}`} className="text-sm font-semibold text-amber-800">View Event Account Statement →</Link> : null;
  return <section className="event-finance space-y-4 rounded-xl border border-slate-200 bg-white p-4 text-slate-900">
    <div className="flex flex-wrap items-center justify-between gap-3"><div><h2 className="font-bold">Paid Expenses</h2><p className="mt-1 text-sm text-slate-600">Total {money(rows.reduce((sum, row) => sum + row.amount, 0))} · Separate from customer advances</p></div>{canManage && <button type="button" disabled={loading || saving} onClick={() => edit()} className="min-h-11 rounded-xl bg-amber-500 px-4 text-sm font-bold disabled:opacity-50">Add Expense</button>}</div>
    {error && <p role="alert" className="text-sm text-red-700">{error} <button type="button" disabled={saving} onClick={() => void load()} className="underline">Refresh expenses</button></p>}
    {open && <form onSubmit={submit} aria-label={editing ? 'Edit paid expense' : 'Add paid expense'} className="space-y-3 rounded-xl bg-slate-50 p-4">
      <h3 className="font-bold">{editing ? 'Edit Expense' : 'Add Expense'}</h3>
      <div className="grid gap-3 sm:grid-cols-2"><label className="text-sm font-medium">Expense type<select required value={typeId} onChange={(event) => setTypeId(event.target.value)} className={expenseInputClass}><option value="">Select expense type</option>{types.filter((type) => type.isActive || type.id === editing?.typeId).map((type) => <option key={type.id} value={type.id}>{type.id === editing?.typeId ? editing.typeName : type.name} ({type.kind === 'PERCENTAGE' ? '%' : '₹'}){!type.isActive ? ' · Inactive' : ''}</option>)}</select></label>
        <label className="text-sm font-medium">{kind === 'PERCENTAGE' ? 'Percentage (%)' : 'Paid amount (₹)'}<input required type="number" step="0.01" min="0.01" max={kind === 'PERCENTAGE' ? 100 : 1000000000} value={value} onChange={(event) => setValue(event.target.value)} className={expenseInputClass} /></label>
        <label className="text-sm font-medium">Paid date<input required type="date" max={indiaToday()} value={paidDate} onChange={(event) => setPaidDate(event.target.value)} className={expenseInputClass} /></label>
        <label className="text-sm font-medium">Payment mode<select value={mode} onChange={(event) => setMode(event.target.value)} className={expenseInputClass}>{EXPENSE_MODES.map((option) => <option key={option} value={option}>{option.replaceAll('_', ' ')}</option>)}</select></label>
      </div>
      <label className="block text-sm font-medium">Remark<textarea maxLength={1000} value={remark} onChange={(event) => setRemark(event.target.value)} className={expenseInputClass} /></label>
      <p aria-live="polite" className="text-sm font-semibold">Paid expense: {amount === null ? 'Enter a valid amount' : money(amount)}</p>
      {kind === 'PERCENTAGE' && <p className="text-xs text-slate-600">{sameType && !recalculate ? `Uses the recorded event price ${money(editing.baseAmount)}.` : booking.isPackagePriceFinalized ? `Uses finalized event price ${money(booking.packageRate)}.` : 'Finalize the event price before adding percentage expenses.'} This calculation will remain fixed after saving.</p>}
      {sameType && kind === 'PERCENTAGE' && <label className="flex items-center gap-2 text-sm"><input type="checkbox" checked={recalculate} disabled={!booking.isPackagePriceFinalized} onChange={(event) => setRecalculate(event.target.checked)} />Use current finalized event price for this edit ({money(booking.packageRate)})</label>}
      {!types.some((type) => type.isActive) && !editing && <p className="text-sm text-amber-800">Ask your company administrator to add an active expense type in Settings → Expense Types.</p>}
      <div className="flex gap-3"><button disabled={saving || !typeId || amount === null || amount < 0.01} className="min-h-11 rounded-xl bg-slate-900 px-4 text-sm font-bold text-white disabled:opacity-50">{saving ? 'Saving…' : 'Save paid expense'}</button><button type="button" disabled={saving} onClick={() => setOpen(false)} className="min-h-11 px-3 text-sm">Cancel</button></div>
    </form>}
    {loading ? <p role="status" className="text-sm">Loading expenses…</p> : <ExpenseTable rows={rows} onEdit={canManage && !saving ? edit : undefined} />}
    {canAccount && <Link href={`/decoration/reports/accounts/?event=${booking.id}`} className="inline-block min-h-11 py-3 text-sm font-semibold text-amber-800">View Event Account Statement →</Link>}
  </section>;
}

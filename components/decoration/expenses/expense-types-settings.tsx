'use client';
import { FormEvent, useCallback, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { fetchExpenseTypes, saveExpenseType } from '@/lib/decoration/expenses/api';
import { ExpenseKind, ExpenseType } from '@/lib/decoration/expenses/domain';
import { expenseInputClass } from './shared';

export function ExpenseTypesSettings() {
  const { accessToken, user } = useAuth();
  const allowed = user?.role === 'company_admin' || hasPermission(user, PERMISSIONS.DECORATION_EXPENSE_TYPES_MANAGE);
  const [types, setTypes] = useState<ExpenseType[]>([]), [error, setError] = useState(''), [loading, setLoading] = useState(true), [saving, setSaving] = useState(false);
  const [editing, setEditing] = useState<ExpenseType | null>(null), [name, setName] = useState(''), [kind, setKind] = useState<ExpenseKind>('RUPEES');
  const latestLoad = useRef(0);
  const load = useCallback(async () => {
    if (!accessToken || !allowed) return;
    const requestId = ++latestLoad.current;
    setLoading(true);
    try { const result = await fetchExpenseTypes(accessToken); if (requestId !== latestLoad.current) return; setTypes(result); setError(''); }
    catch (reason) { if (requestId !== latestLoad.current) return; setError(reason instanceof Error ? reason.message : 'Unable to load expense types.'); }
    finally { if (requestId === latestLoad.current) setLoading(false); }
  }, [accessToken, allowed]);
  useEffect(() => { void load(); return () => { latestLoad.current += 1; }; }, [load]);
  function reset() { setEditing(null); setName(''); setKind('RUPEES'); }
  async function save(event: FormEvent) {
    event.preventDefault(); if (!accessToken) return;
    setSaving(true); setError('');
    try { await saveExpenseType(accessToken, { name, kind, isActive: editing?.isActive ?? true }, editing?.id); reset(); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save expense type.'); }
    finally { setSaving(false); }
  }
  async function toggle(type: ExpenseType) {
    if (!accessToken) return; setSaving(true); setError('');
    try { await saveExpenseType(accessToken, { name: type.name, kind: type.kind, isActive: !type.isActive }, type.id); await load(); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to update expense type.'); }
    finally { setSaving(false); }
  }
  if (!allowed) return <p>You do not have permission to manage expense types.</p>;
  return <section className="space-y-5 rounded-2xl border border-slate-200 bg-white p-5 text-slate-900">
    <div><h2 className="text-xl font-bold">Expense Types</h2><p className="mt-1 text-sm text-slate-600">Set up paid expense categories for your events. Percentage entries use the finalized event price. Start with restaurant commission (%), printing, transport, external labour and other expenses (₹).</p></div>
    {error && <p role="alert" className="text-sm text-red-700">{error}</p>}
    <form onSubmit={save} className="flex flex-wrap items-end gap-3">
      <label className="min-w-48 flex-1 text-sm font-medium">Expense name<input required maxLength={100} value={name} onChange={(event) => setName(event.target.value)} className={expenseInputClass} /></label>
      <label className="text-sm font-medium">Amount type<select value={kind} disabled={Boolean(editing)} onChange={(event) => setKind(event.target.value as ExpenseKind)} className={expenseInputClass}><option value="RUPEES">Amount (₹)</option><option value="PERCENTAGE">Percentage (%)</option></select></label>
      <button disabled={saving || loading || !name.trim()} className="min-h-11 rounded-xl bg-amber-500 px-4 font-bold text-slate-950 disabled:opacity-50">{saving ? 'Saving…' : editing ? 'Save type' : 'Add type'}</button>
      {editing && <button type="button" disabled={saving} onClick={reset} className="min-h-11 px-3 text-sm">Cancel edit</button>}
    </form>
    {loading ? <p role="status">Loading expense types…</p> : !types.length ? <p className="text-sm text-slate-500">No expense types yet. Add your first type above.</p> : <ul className="divide-y divide-slate-100">{types.map((type) => <li key={type.id} className="flex flex-wrap items-center justify-between gap-3 py-3"><div><p className="font-semibold">{type.name}</p><p className="text-sm text-slate-500">{type.kind === 'PERCENTAGE' ? 'Percentage (%)' : 'Amount (₹)'} · {type.isActive ? 'Active' : 'Inactive'}</p></div><div className="flex gap-3"><button disabled={saving} onClick={() => { setEditing(type); setName(type.name); setKind(type.kind); }} className="min-h-11 text-sm font-semibold">Edit</button><button disabled={saving} onClick={() => void toggle(type)} className="min-h-11 text-sm font-semibold text-amber-800">{type.isActive ? 'Deactivate' : 'Activate'}</button></div></li>)}</ul>}
    <p className="text-xs text-slate-500">Changing a name or deactivating a type preserves recorded expenses. To change the calculation method, create a new type.</p>
  </section>;
}

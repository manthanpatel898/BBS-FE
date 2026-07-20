'use client';

import { FormEvent, useEffect, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { BodyPortal } from '@/components/ui/body-portal';
import { useModalViewport } from '@/components/ui/use-modal-viewport';
import { addDecorationPayment } from '@/lib/auth/api';
import type { DecorationBooking } from '@/lib/auth/types';
import { buildDecorationPaymentPayload, type DecorationPaymentForm, validateDecorationPaymentForm } from '@/lib/decoration/payment-form';

const input = 'light-form-field mt-1 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-base text-slate-900 outline-none focus:border-amber-500 focus:ring-2 focus:ring-amber-100';

export function DecorationPaymentModal({ booking, onClose, onSaved }: { booking: DecorationBooking; onClose: () => void; onSaved: (booking: DecorationBooking) => void }) {
  const { accessToken } = useAuth();
  const closeRef = useRef<HTMLButtonElement>(null);
  const [form, setForm] = useState<DecorationPaymentForm>({ amount: '', date: new Date().toLocaleDateString('en-CA'), mode: 'CASH', remark: '' });
  const [errors, setErrors] = useState<Partial<Record<keyof DecorationPaymentForm, string>>>({});
  const [requestError, setRequestError] = useState('');
  const [saving, setSaving] = useState(false);
  useModalViewport(onClose, saving);
  useEffect(() => { closeRef.current?.focus(); }, []);
  function update(key: keyof DecorationPaymentForm, value: string) { setForm((current) => ({ ...current, [key]: value })); setErrors((current) => ({ ...current, [key]: undefined })); }
  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || saving) return;
    const nextErrors = validateDecorationPaymentForm(form, booking.outstandingAmount);
    setErrors(nextErrors);
    if (Object.keys(nextErrors).length) return;
    setSaving(true); setRequestError('');
    try { onSaved(await addDecorationPayment(accessToken, booking.id, buildDecorationPaymentPayload(form))); }
    catch (reason) { setRequestError(reason instanceof Error ? reason.message : 'Unable to save advance payment.'); }
    finally { setSaving(false); }
  }
  return <BodyPortal><div className="fixed inset-0 z-[70] flex items-end justify-center bg-slate-950/50 p-0 backdrop-blur-sm sm:items-center sm:p-5" role="dialog" aria-modal="true" aria-labelledby="decoration-payment-title" onMouseDown={(event) => { if (event.target === event.currentTarget && !saving) onClose(); }}>
    <div className="max-h-[95dvh] w-full overflow-y-auto rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-xl sm:rounded-3xl sm:p-7">
      <div className="flex items-start justify-between gap-4"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-600">{booking.bookingNumber}</p><h2 id="decoration-payment-title" className="mt-1 text-2xl font-bold text-slate-950">Add Advance</h2><p className="mt-1 text-sm text-slate-500">Pending ₹{booking.outstandingAmount.toLocaleString('en-IN')}</p></div><button ref={closeRef} type="button" aria-label="Close Add Advance" disabled={saving} onClick={onClose} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-2xl text-slate-500 disabled:opacity-50">×</button></div>
      {requestError ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{requestError}</p> : null}
      <form onSubmit={submit} className="mt-6 space-y-4">
        <Field label="Amount" error={errors.amount}><input autoFocus type="number" inputMode="decimal" min="0.01" step="0.01" max={booking.outstandingAmount} value={form.amount} onChange={(event) => update('amount', event.target.value)} className={input} /></Field>
        <div className="grid gap-4 sm:grid-cols-2"><Field label="Payment date" error={errors.date}><input type="date" value={form.date} onChange={(event) => update('date', event.target.value)} className={input} /></Field><Field label="Payment mode" error={errors.mode}><select value={form.mode} onChange={(event) => update('mode', event.target.value)} className={input}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="CARD">Card</option><option value="BANK_TRANSFER">Bank transfer</option><option value="CHEQUE">Cheque</option></select></Field></div>
        <Field label="Remark (optional)" error={errors.remark}><textarea rows={3} maxLength={500} value={form.remark} onChange={(event) => update('remark', event.target.value)} className={input} /></Field>
        <button type="submit" disabled={saving} className="w-full rounded-xl bg-amber-500 px-5 py-3.5 font-bold text-slate-950 hover:bg-amber-400 disabled:cursor-not-allowed disabled:opacity-60">{saving ? 'Saving advance…' : 'Save Advance'}</button>
      </form>
    </div>
  </div></BodyPortal>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block text-sm font-semibold text-slate-700">{label}{children}{error ? <span className="mt-1 block text-xs font-normal text-red-600">{error}</span> : null}</label>; }

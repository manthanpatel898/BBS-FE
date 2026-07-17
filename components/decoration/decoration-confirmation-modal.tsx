'use client';

import { FormEvent, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { LoadingButton } from '@/components/ui/loading-button';
import { BodyPortal } from '@/components/ui/body-portal';
import { useModalViewport } from '@/components/ui/use-modal-viewport';
import { confirmDecorationBooking } from '@/lib/auth/api';
import type { DecorationBooking } from '@/lib/auth/types';
import { buildDecorationConfirmationPayload, getDecorationConfirmationRequestId, validateDecorationConfirmationForm } from '@/lib/decoration/confirmation-form';

const inputClass = 'min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function DecorationConfirmationModal({ booking, onClose, onConfirmed }: { booking: DecorationBooking; onClose: () => void; onConfirmed: (booking: DecorationBooking) => void }) {
  const { accessToken } = useAuth();
  const [form, setForm] = useState({ advanceAmount: '0', paymentDate: new Date().toLocaleDateString('en-CA'), paymentMode: 'CASH', remark: '' });
  const [requestId] = useState(() => getDecorationConfirmationRequestId('', () => crypto.randomUUID()));
  const [errors, setErrors] = useState<Partial<Record<keyof typeof form, string>>>({});
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  useModalViewport(onClose, busy);
  const amount = Number(form.advanceAmount);
  const pending = useMemo(() => Math.max(0, booking.outstandingAmount - (Number.isFinite(amount) ? Math.max(0, amount) : 0)), [amount, booking.outstandingAmount]);
  const set = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));

  async function submit(event: FormEvent) {
    event.preventDefault();
    if (!accessToken || busy) return;
    const validation = validateDecorationConfirmationForm(form, booking.packageRate, booking.totalCollected);
    setErrors(validation);
    if (Object.keys(validation).length) return;
    setBusy(true); setError('');
    try {
      const result = await confirmDecorationBooking(accessToken, booking.id, buildDecorationConfirmationPayload(form, requestId));
      onConfirmed(result.booking);
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to confirm booking. Please retry.');
    } finally { setBusy(false); }
  }

  return <BodyPortal><div className="modal-viewport-pad fixed inset-0 z-[70] flex items-center justify-center bg-slate-900/55 px-3 backdrop-blur-sm sm:px-4 sm:py-6" role="dialog" aria-modal="true" aria-label="Confirm decoration booking" onMouseDown={(event) => { if (event.target === event.currentTarget && !busy) onClose(); }}><div className="safe-pad-bottom app-scrollbar relative max-h-[calc(100dvh-1.5rem)] w-full max-w-2xl overflow-y-auto rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl sm:p-7"><button type="button" disabled={busy} onClick={onClose} aria-label="Close confirmation" className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-500 hover:bg-slate-100 disabled:opacity-50">×</button><div className="pr-12"><p className="text-xs font-bold uppercase tracking-widest text-amber-600">Advance Payment</p><h2 className="mt-2 text-2xl font-bold text-slate-900">Confirm booking</h2><p className="mt-2 text-sm text-slate-600">Confirm {booking.customer.name}&apos;s event. Advance payment is optional.</p></div>
    {error ? <p role="alert" className="mt-5 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p> : null}
    <div className="mt-6 grid grid-cols-3 gap-3 rounded-2xl border border-slate-200 bg-slate-50 p-4 text-sm"><div><p className="text-slate-500">Package</p><p className="mt-1 font-bold text-slate-900">{money(booking.packageRate)}</p></div><div><p className="text-slate-500">Received</p><p className="mt-1 font-bold text-emerald-700">{money(booking.totalCollected)}</p></div><div><p className="text-slate-500">Pending after</p><p className="mt-1 font-bold text-red-700">{money(pending)}</p></div></div>
    <form onSubmit={submit} className="mt-6 space-y-5"><Field label="Advance Amount" error={errors.advanceAmount}><input autoFocus type="number" min="0" step="0.01" value={form.advanceAmount} onChange={(event) => set('advanceAmount', event.target.value)} className={inputClass} /></Field>
      {Number.isFinite(amount) && amount > 0 ? <div className="grid gap-4 sm:grid-cols-2"><Field label="Payment Date" error={errors.paymentDate}><input type="date" value={form.paymentDate} onChange={(event) => set('paymentDate', event.target.value)} className={inputClass} /></Field><Field label="Payment Mode" error={errors.paymentMode}><select value={form.paymentMode} onChange={(event) => set('paymentMode', event.target.value)} className={inputClass}><option value="CASH">Cash</option><option value="UPI">UPI</option><option value="BANK TRANSFER">Bank Transfer</option><option value="CARD">Card</option><option value="CHEQUE">Cheque</option></select></Field></div> : null}
      {Number.isFinite(amount) && amount > 0 ? <Field label="Remark (optional)"><textarea rows={3} maxLength={500} value={form.remark} onChange={(event) => set('remark', event.target.value)} className={inputClass} /></Field> : null}
      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onClose} className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-900 hover:bg-slate-50 disabled:opacity-50">Cancel</button><LoadingButton type="submit" isLoading={busy} disabled={busy} className="rounded-xl bg-amber-400 px-5 py-3 font-bold text-slate-950 hover:bg-amber-500 disabled:opacity-60">Confirm Booking</LoadingButton></div>
    </form></div></div></BodyPortal>;
}

function Field({ label, error, children }: { label: string; error?: string; children: React.ReactNode }) { return <label className="block space-y-2"><span className="text-sm font-semibold text-slate-700">{label}</span>{children}{error ? <span className="block text-xs font-medium text-red-600">{error}</span> : null}</label>; }

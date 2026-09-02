'use client';

import { FormEvent, useState } from 'react';
import { CommonModal } from '@/components/ui/common-modal';
import type { FeedbackPrefill } from '@/lib/feedback/types';
import { FEEDBACK_CONTROL_CLASS } from '@/lib/booking-feedback/ui';

export function FeedbackInvitationModal({ onClose, onCreate }: { onClose: () => void; onCreate: (input: FeedbackPrefill & { expiresAt?: string }) => Promise<string> }) {
  const [form, setForm] = useState({ fullName: '', designation: '', company: '', expiresAt: '' });
  const [link, setLink] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const update = (field: keyof typeof form, value: string) => setForm((current) => ({ ...current, [field]: value }));
  async function submit(event: FormEvent) {
    event.preventDefault(); setBusy(true); setError('');
    try { setLink(await onCreate({ fullName: form.fullName.trim(), designation: form.designation.trim(), company: form.company.trim(), ...(form.expiresAt ? { expiresAt: new Date(`${form.expiresAt}T23:59:59`).toISOString() } : {}) })); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to create feedback link.'); }
    finally { setBusy(false); }
  }
  const input = `${FEEDBACK_CONTROL_CLASS} w-full rounded-xl border border-slate-300 px-4 py-3 text-sm font-semibold outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100`;
  return <CommonModal title={link ? 'Feedback link ready' : 'Create feedback link'} description={link ? 'Copy this single-use link now. For security, it is not shown again.' : 'Prefill the customer details and choose an optional expiry date.'} onClose={onClose} widthClassName="max-w-xl" panelClassName="feedback-surface" mobileFullScreen>
    {link ? <div className="space-y-4"><label className="block text-sm font-bold text-slate-700">Secure customer link<textarea readOnly value={link} rows={4} className={`${input} mt-2 resize-none`} /></label><button type="button" onClick={() => navigator.clipboard.writeText(link)} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950">Copy feedback link</button></div> :
      <form className="space-y-4" onSubmit={submit}><label className="block text-sm font-bold text-slate-700">Customer name<input required maxLength={80} value={form.fullName} onChange={(e) => update('fullName', e.target.value)} className={`${input} mt-2`} /></label><div className="grid gap-4 sm:grid-cols-2"><label className="block text-sm font-bold text-slate-700">Designation<input required maxLength={80} value={form.designation} onChange={(e) => update('designation', e.target.value)} className={`${input} mt-2`} /></label><label className="block text-sm font-bold text-slate-700">Company<input required maxLength={120} value={form.company} onChange={(e) => update('company', e.target.value)} className={`${input} mt-2`} /></label></div><label className="block text-sm font-bold text-slate-700">Expiry date (optional)<input type="date" value={form.expiresAt} min={new Date().toISOString().slice(0, 10)} onChange={(e) => update('expiresAt', e.target.value)} className={`${input} mt-2`} /></label>{error ? <p role="alert" className="rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}<button disabled={busy} className="w-full rounded-xl bg-amber-400 px-4 py-3 font-bold text-slate-950 disabled:opacity-50">{busy ? 'Creating secure link…' : 'Create feedback link'}</button></form>}
  </CommonModal>;
}

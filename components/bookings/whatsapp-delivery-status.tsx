'use client';
import React, { useEffect, useState } from 'react';
import { fetchWhatsappDelivery, updateWhatsappConsent, type WhatsappDelivery } from '@/lib/auth/api';

const states: Record<string, string> = { PENDING: 'Queued', PROCESSING: 'Sending', ACCEPTED: 'Accepted by WhatsApp provider', SENT: 'Sent', DELIVERED: 'Delivered', READ: 'Read', FAILED: 'Could not deliver', SKIPPED: 'Not sent - check consent and restaurant configuration', UNCERTAIN: 'Delivery unknown - not resent automatically' };
const events: Record<string, string> = { INQUIRY_CREATED: 'Inquiry', BOOKING_CONFIRMED: 'Confirmation', MENU_FINALIZED: 'Menu' };
export function WhatsappDeliveryStatus({ entries }: { entries: WhatsappDelivery[] }) {
  return <div className="space-y-1 text-xs text-slate-700" aria-live="polite">{entries.length ? entries.map(entry => <p key={entry._id}>{events[entry.eventType] ?? 'Message'}: {states[entry.status] ?? 'Status unavailable'}</p>) : <p>No WhatsApp messages requested yet.</p>}</div>;
}

export function WhatsappBookingCommunication({ token, orderId, customerId, consentGranted, compact = false }: { token: string; orderId: string; customerId: string; consentGranted: boolean; compact?: boolean }) {
  const [entries, setEntries] = useState<WhatsappDelivery[]>([]);
  const [granted, setGranted] = useState(consentGranted);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [refreshVersion, setRefreshVersion] = useState(0);
  useEffect(() => {
    if (compact) return;
    let active = true; let timer: ReturnType<typeof setTimeout> | undefined; let polls = 0;
    async function refresh() {
      try {
        const result = await fetchWhatsappDelivery(token, orderId);
        if (!active) return;
        setEntries(result);
        if (++polls < 12 && (polls < 3 || result.some(item => ['PENDING', 'PROCESSING', 'ACCEPTED', 'SENT'].includes(item.status)))) timer = setTimeout(() => void refresh(), 10000);
      } catch { if (active) setError('Unable to refresh WhatsApp status.'); }
    }
    void refresh();
    return () => { active = false; if (timer) clearTimeout(timer); };
  }, [token, orderId, compact, refreshVersion]);
  async function changeConsent(value: boolean) {
    if (busy) return;
    setBusy(true); setError('');
    try { await updateWhatsappConsent(token, customerId, value); setGranted(value); }
    catch (error) { setError(error instanceof Error ? error.message : 'Unable to update consent.'); }
    finally { setBusy(false); }
  }
  return <details className="rounded-xl border border-slate-200 bg-slate-50 p-3 text-slate-900">
    <summary className="cursor-pointer text-sm font-semibold">WhatsApp {compact ? 'permission' : 'updates'} · {granted ? 'consent recorded' : 'consent required'}</summary>
    <label className="mt-3 flex items-start gap-2 text-sm"><input type="checkbox" checked={granted} disabled={busy} onChange={event => void changeConsent(event.target.checked)} className="mt-1 h-4 w-4 shrink-0 accent-amber-500" /><span>The customer agreed to receive booking and menu updates on this number. Uncheck to withdraw consent.</span></label>
    {!compact ? <div className="mt-3"><WhatsappDeliveryStatus entries={entries} /><button type="button" onClick={() => { setError(''); setRefreshVersion(value => value + 1); }} className="mt-2 min-h-11 rounded-lg border border-slate-300 bg-white px-3 text-sm font-semibold text-slate-800">Refresh status</button></div> : null}
    {error ? <p role="alert" className="mt-2 text-sm text-red-700">{error}</p> : null}
  </details>;
}

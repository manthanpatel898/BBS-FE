'use client';

import Link from 'next/link';
import { ReactNode, useEffect, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationAdvanceLedger } from '@/components/decoration/decoration-advance-ledger';
import { DecorationConfirmationModal } from '@/components/decoration/decoration-confirmation-modal';
import { DecorationInquiryForm } from '@/components/decoration/decoration-inquiry-form';
import { DecorationFollowupModal } from '@/components/decoration/decoration-followup-modal';
import { DecorationPaymentModal } from '@/components/decoration/decoration-payment-modal';
import { DecorationSelectionModal } from '@/components/decoration/decoration-selection-modal';
import { DecorationSnapshotGallery } from '@/components/decoration/decoration-snapshot-gallery';
import { DecorationStatusBadge } from '@/components/decoration/decoration-status-badge';
import { fetchDecorationBooking } from '@/lib/auth/api';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import type { DecorationBooking } from '@/lib/auth/types';
import { getDecorationDetailActions, type DecorationDetailActionId } from '@/lib/decoration/event-detail-view';

const displayDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });

export function DecorationEventDetailModal({ bookingId, initialBooking, onClose, onUpdated }: { bookingId: string; initialBooking?: DecorationBooking | null; onClose?: () => void; onUpdated?: (booking: DecorationBooking) => void }) {
  const { accessToken } = useAuth();
  const [booking, setBooking] = useState<DecorationBooking | null>(initialBooking?.id === bookingId ? initialBooking : null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!booking);
  const [child, setChild] = useState<'edit' | 'confirm' | 'advance' | 'followup' | 'selection' | null>(null);
  useEffect(() => {
    if (!accessToken || !bookingId) { setLoading(false); return; }
    let active = true; setError(''); setLoading((current) => current || !booking);
    fetchDecorationBooking(accessToken, bookingId).then((value) => { if (active) { setBooking(value); onUpdated?.(value); } }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load event.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, bookingId]);
  function updated(value: DecorationBooking) { setBooking(value); onUpdated?.(value); setChild(null); }
  return <div className={onClose ? 'fixed inset-0 z-50 overflow-y-auto bg-slate-900/45 p-0 backdrop-blur-sm sm:p-5' : ''} role={onClose ? 'dialog' : undefined} aria-modal={onClose ? true : undefined} aria-label={onClose ? 'Decoration event details' : undefined} onMouseDown={(event) => { if (onClose && event.target === event.currentTarget && !child) onClose(); }}>
    <div className={onClose ? 'relative mx-auto min-h-full w-full max-w-6xl bg-slate-50 shadow-2xl sm:min-h-0 sm:rounded-3xl' : ''}>
      {onClose ? <button type="button" onClick={onClose} aria-label="Close Event Detail" className="absolute right-4 top-4 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl text-slate-500 shadow-sm hover:text-slate-900">×</button> : null}
      {loading && !booking ? <State title="Loading event" message="Fetching the latest event details…" /> : !booking ? <State title="Unable to open event" message={error || 'Decoration event was not found.'} /> : <Detail booking={booking} warning={error} onAction={(action) => { if (action === 'edit' || action === 'confirm' || action === 'advance' || action === 'followup') setChild(action); else if (action === 'choose-decoration' || action === 'edit-decoration') setChild('selection'); }} />}
    </div>
    {child === 'edit' && booking ? <DecorationInquiryForm booking={booking} onClose={() => setChild(null)} onSaved={updated} /> : null}
    {child === 'confirm' && booking ? <DecorationConfirmationModal booking={booking} onClose={() => setChild(null)} onConfirmed={updated} /> : null}
    {child === 'advance' && booking ? <DecorationPaymentModal booking={booking} onClose={() => setChild(null)} onSaved={updated} /> : null}
    {child === 'followup' && booking ? <DecorationFollowupModal booking={booking} onClose={() => setChild(null)} onSaved={updated} /> : null}
    {child === 'selection' && booking ? <DecorationSelectionModal booking={booking} onClose={() => setChild(null)} onSaved={updated} /> : null}
  </div>;
}

function Detail({ booking, warning, onAction }: { booking: DecorationBooking; warning: string; onAction: (action: DecorationDetailActionId) => void }) {
  return <section className="mx-auto max-w-6xl p-4 pb-32 pt-20 sm:p-6 sm:pb-32 sm:pt-16 lg:p-8 lg:pb-32 lg:pt-16">
    {warning ? <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Latest refresh failed. Showing the already loaded booking. {warning}</p> : null}
    <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex items-start justify-between gap-14"><div><p className="text-xs font-bold uppercase tracking-widest text-amber-600">{booking.bookingNumber}</p><h1 className="mt-1 text-2xl font-bold text-slate-950 sm:text-3xl">{booking.customer.name}</h1><p className="mt-1 text-sm text-slate-500">{booking.eventType.name}</p></div><DecorationStatusBadge status={booking.status} /></div></header>
    <div className="mt-5 grid gap-5 lg:grid-cols-3"><div className="space-y-5 lg:col-span-2">
      <Card title="Event information"><Grid rows={[["Event type", booking.eventType.name], ["Date", booking.startDate === booking.endDate ? displayDate(booking.startDate) : `${displayDate(booking.startDate)} – ${displayDate(booking.endDate)}`], ["Time", `${booking.startTime} – ${booking.endTime}`], ["Slot", booking.timeSlot], ["Location", booking.venue.name], ["Hall", booking.hall?.name || 'Not applicable'], ["Address", booking.address || 'Not provided'], ["Created by", booking.createdBySnapshot?.name || 'Not available']]} /></Card>
      <Card title="Advance payments"><DecorationAdvanceLedger booking={booking} /></Card>
      <Card title={`Decoration snapshot (${booking.decorationSnapshot?.length ?? 0})`}><DecorationSnapshotGallery lines={booking.decorationSnapshot ?? []} /></Card>
    </div><aside className="space-y-5">
      <Card title="Customer"><Grid rows={[["Name", booking.customer.name], ["Mobile", booking.customer.mobile]]} /></Card>
      <Card title={`Follow-ups (${booking.followups.length})`}>{booking.followups.length ? <div className="space-y-3">{booking.followups.slice().reverse().map((item) => <div key={item.id} className="border-b border-slate-100 pb-3 text-sm last:border-0"><p>{item.note}</p><p className="mt-1 text-xs text-slate-500">{displayDate(item.date)} · {item.recordedBy}</p></div>)}</div> : <p className="text-sm text-slate-500">No follow-ups recorded.</p>}</Card>
      {booking.notes ? <Card title="Notes"><p className="whitespace-pre-wrap text-sm text-slate-700">{booking.notes}</p></Card> : null}
    </aside></div>
    <BottomActions booking={booking} onAction={onAction} />
  </section>;
}

function BottomActions({ booking, onAction }: { booking: DecorationBooking; onAction: (action: DecorationDetailActionId) => void }) {
  const { user } = useAuth(); const admin = user?.role === 'company_admin';
  const actions = getDecorationDetailActions(booking, {
    canEdit: admin || hasPermission(user, PERMISSIONS.DECORATION_BOOKINGS_UPDATE),
    canConfirm: admin || hasPermission(user, PERMISSIONS.DECORATION_BOOKINGS_CONFIRM),
    canAddPayment: admin || hasPermission(user, PERMISSIONS.DECORATION_PAYMENTS_MANAGE),
    canManageFollowups: admin || hasPermission(user, PERMISSIONS.DECORATION_FOLLOWUPS_MANAGE),
    canSelectDecoration: admin || hasPermission(user, PERMISSIONS.DECORATION_SELECTION_MANAGE),
    canPrint: admin || hasPermission(user, PERMISSIONS.DECORATION_PRINT),
  });
  return <div className="fixed inset-x-0 bottom-0 z-[60] border-t border-slate-200 bg-white/95 p-3 shadow-[0_-12px_30px_rgba(15,23,42,0.12)] backdrop-blur sm:absolute sm:rounded-b-3xl sm:px-6 sm:py-4"><div className="mx-auto flex max-w-6xl gap-2 overflow-x-auto pb-1 sm:flex-wrap sm:justify-end sm:overflow-visible">{actions.map((action) => {
    const className = `shrink-0 rounded-xl px-4 py-3 text-sm font-bold transition focus:outline-none focus:ring-2 focus:ring-amber-300 ${action.tone === 'primary' ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : action.tone === 'success' ? 'bg-emerald-600 text-white hover:bg-emerald-700' : 'border border-slate-300 bg-white text-slate-900 hover:bg-slate-50'}`;
    if (action.id === 'choose-decoration' || action.id === 'edit-decoration') return <button key={action.id} type="button" onClick={() => onAction(action.id)} className={className}>{action.label}</button>;
    if (action.id === 'view' || action.id === 'download' || action.id === 'print') return <Link key={action.id} href={`/decoration/print?bookingId=${encodeURIComponent(booking.id)}&mode=${action.id}`} className={className}>{action.label}</Link>;
    if (action.id === 'followup') return <button key={action.id} type="button" onClick={() => onAction(action.id)} className={className}>{action.label}</button>;
    return <button key={action.id} type="button" onClick={() => onAction(action.id)} className={className}>{action.label}</button>;
  })}</div></div>;
}

function State({ title, message }: { title: string; message: string }) { return <main className="mx-auto max-w-xl p-16 text-center"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-500">{message}</p></main>; }
function Card({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold text-slate-950">{title}</h2>{children}</section>; }
function Grid({ rows }: { rows: Array<[string, string]> }) { return <dl className="grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-400">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-800">{value}</dd></div>)}</dl>; }

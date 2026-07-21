'use client';

import { ReactNode, useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationAdvanceLedger } from '@/components/decoration/decoration-advance-ledger';
import { DecorationConfirmationModal } from '@/components/decoration/decoration-confirmation-modal';
import { DecorationInquiryForm } from '@/components/decoration/decoration-inquiry-form';
import { DecorationFollowupModal } from '@/components/decoration/decoration-followup-modal';
import { DecorationPaymentModal } from '@/components/decoration/decoration-payment-modal';
import { DecorationSelectionModal } from '@/components/decoration/decoration-selection-modal';
import { DecorationSnapshotGallery } from '@/components/decoration/decoration-snapshot-gallery';
import { DecorationStatusBadge } from '@/components/decoration/decoration-status-badge';
import { downloadDecorationCustomerPdf, fetchDecorationBooking } from '@/lib/auth/api';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import type { DecorationBooking } from '@/lib/auth/types';
import { getDecorationDetailActions, type DecorationDetailActionId } from '@/lib/decoration/event-detail-view';
import { createPdfDownloadController, saveDownloadedPdf } from '@/lib/decoration/customer-document-download';
import { BookingDownloadLifecycle } from '@/lib/decoration/booking-download-lifecycle';

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
  return <div className={onClose ? 'fixed inset-0 z-50 overflow-hidden bg-slate-900/45 p-0 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-5' : ''} role={onClose ? 'dialog' : undefined} aria-modal={onClose ? true : undefined} aria-label={onClose ? 'Decoration event details' : undefined} onMouseDown={(event) => { if (onClose && event.target === event.currentTarget && !child) onClose(); }}>
    <div className={onClose ? 'relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-[calc(100dvh-2.5rem)] sm:rounded-3xl' : ''}>
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
  return <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-4 pb-6 pt-20 sm:p-6 sm:pb-6 sm:pt-16 lg:p-8 lg:pb-8 lg:pt-16">
      {warning ? <p role="alert" className="mb-5 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Latest refresh failed. Showing the already loaded booking. {warning}</p> : null}
      <header className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><div className="flex flex-col items-start gap-3 sm:flex-row sm:justify-between sm:gap-6"><div className="min-w-0"><p className="text-xs font-bold uppercase tracking-widest text-amber-600">{booking.bookingNumber}</p><h1 className="mt-1 break-words text-2xl font-bold text-slate-950 sm:text-3xl">{booking.customer.name}</h1><p className="mt-1 text-sm text-slate-600">{booking.eventType.name}</p></div><DecorationStatusBadge status={booking.status} /></div></header>
      <div className="mt-5 grid gap-5 lg:grid-cols-3"><div className="space-y-5 lg:col-span-2">
      <Card title="Event information"><Grid rows={[["Event type", booking.eventType.name], ["Event Date", displayDate(booking.startDate)], ["Time", `${booking.startTime} – ${booking.endTime}`], ["Slot", booking.timeSlot], ["Location", booking.venue.name], ["Hall", booking.hall?.name || 'Not applicable'], ["Address", booking.address || 'Not provided'], ["Created by", booking.createdBySnapshot?.name || 'Not available']]} /></Card>
      <Card title="Advance payments"><DecorationAdvanceLedger booking={booking} /></Card>
      <Card title={`Decoration snapshot (${booking.decorationSnapshot?.length ?? 0})`}><DecorationSnapshotGallery lines={booking.decorationSnapshot ?? []} /></Card>
    </div><aside className="space-y-5">
      <Card title="Customer"><Grid rows={[["Name", booking.customer.name], ["Mobile", booking.customer.mobile]]} /></Card>
      <Card title={`Follow-ups (${booking.followups.length})`}>{booking.followups.length ? <div className="space-y-3">{booking.followups.slice().reverse().map((item) => <div key={item.id} className="border-b border-slate-100 pb-3 text-sm last:border-0"><p>{item.note}</p><p className="mt-1 text-xs text-slate-500">{displayDate(item.date)} · {item.recordedBy}</p></div>)}</div> : <p className="text-sm text-slate-500">No follow-ups recorded.</p>}</Card>
      {booking.notes ? <Card title="Notes"><p className="whitespace-pre-wrap text-sm text-slate-700">{booking.notes}</p></Card> : null}
      </aside></div>
    </div>
    <BottomActions booking={booking} onAction={onAction} />
  </section>;
}

function BottomActions({ booking, onAction }: { booking: DecorationBooking; onAction: (action: DecorationDetailActionId) => void }) {
  const { accessToken, user } = useAuth(); const admin = user?.role === 'company_admin';
  const actions = getDecorationDetailActions(booking, {
    canEdit: admin || hasPermission(user, PERMISSIONS.DECORATION_BOOKINGS_UPDATE),
    canConfirm: admin || hasPermission(user, PERMISSIONS.DECORATION_BOOKINGS_CONFIRM),
    canAddPayment: admin || hasPermission(user, PERMISSIONS.DECORATION_PAYMENTS_MANAGE),
    canManageFollowups: admin || hasPermission(user, PERMISSIONS.DECORATION_FOLLOWUPS_MANAGE),
    canSelectDecoration: admin || hasPermission(user, PERMISSIONS.DECORATION_SELECTION_MANAGE),
    canPrint: admin || hasPermission(user, PERMISSIONS.DECORATION_PRINT),
  });
  return <BookingDownloadActions key={`${booking.id}:${accessToken ?? ''}`} booking={booking} accessToken={accessToken ?? ''} actions={actions} onAction={onAction} />;
}

function BookingDownloadActions({ booking, accessToken, actions, onAction }: { booking: DecorationBooking; accessToken: string; actions: ReturnType<typeof getDecorationDetailActions>; onAction: (action: DecorationDetailActionId) => void }) {
  const router = useRouter();
  const [activeDocumentAction, setActiveDocumentAction] = useState<'view' | 'download' | 'print' | null>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  return <BookingDownloadLifecycle controllerFactory={({ onBusy, onError }) => createPdfDownloadController({
    download: (signal) => downloadDecorationCustomerPdf(accessToken, booking.id, signal),
    save: saveDownloadedPdf,
    onBusy,
    onError,
  })} onBusyChange={(busy) => { if (!busy) setActiveDocumentAction((current) => current === 'download' ? null : current); }}>{({ error: downloadError, start }) => {
    const renderActions = () => actions.map((action) => {
      const className = `inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-300 ${action.tone === 'primary' ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : action.tone === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`;
      const disabled = activeDocumentAction !== null;
      if (action.id === 'view' || action.id === 'print') return <button key={action.id} type="button" disabled={disabled} onClick={() => {
        if (activeDocumentAction) return;
        setActiveDocumentAction(action.id === 'view' ? 'view' : 'print');
        const destination = `/decoration/print?bookingId=${encodeURIComponent(booking.id)}&mode=${action.id}&returnDate=${encodeURIComponent(booking.startDate.slice(0, 10))}`;
        router.push(destination);
      }} className={`${className} disabled:cursor-wait disabled:opacity-60`}><DocumentActionLabel action={action.id} active={activeDocumentAction} fallback={action.label} /></button>;
      if (action.id === 'download') return <button key={action.id} type="button" onClick={() => { if (!activeDocumentAction) { setActiveDocumentAction('download'); start(); } }} disabled={disabled} className={`${className} disabled:cursor-wait disabled:opacity-60`}><DocumentActionLabel action="download" active={activeDocumentAction} fallback={action.label} /></button>;
      return <button key={action.id} type="button" disabled={disabled} onClick={() => { setMobileActionsOpen(false); onAction(action.id); }} className={`${className} disabled:cursor-wait disabled:opacity-60`}>{action.label}</button>;
    });
    return <div className="z-[60] shrink-0 border-t border-slate-200 bg-white/95 px-4 pb-[calc(0.5rem+var(--zb-safe-bottom))] pt-2 shadow-[0_-18px_35px_rgba(15,23,42,0.1)] backdrop-blur sm:px-6 sm:pb-[calc(0.75rem+var(--zb-safe-bottom))] sm:pt-3 lg:px-8">
      {downloadError ? <p role="alert" className="mx-auto mb-2 max-w-6xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{downloadError}</p> : null}
      <div className={`grid grid-cols-2 gap-2 overflow-hidden transition-[max-height,opacity,margin] duration-200 sm:hidden ${mobileActionsOpen ? 'mb-2 max-h-[520px] opacity-100' : 'max-h-0 opacity-0'}`}>{mobileActionsOpen ? renderActions() : null}</div>
      <button type="button" aria-label={mobileActionsOpen ? 'Hide event actions' : 'Show event actions'} aria-expanded={mobileActionsOpen} onClick={() => setMobileActionsOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:hidden">Actions <span aria-hidden="true" className={`transition-transform ${mobileActionsOpen ? 'rotate-180' : ''}`}>⌃</span></button>
      <div className="hidden grid-cols-2 gap-2 sm:grid min-[720px]:grid-cols-3 lg:grid-cols-4">{renderActions()}</div>
    </div>;
  }}</BookingDownloadLifecycle>;
}

function DocumentActionLabel({ action, active, fallback }: { action: 'view' | 'download' | 'print'; active: 'view' | 'download' | 'print' | null; fallback: string }) {
  const label = action === 'view' ? 'Opening…' : action === 'download' ? 'Downloading…' : 'Preparing print…';
  return <span aria-live="polite" className="inline-flex items-center justify-center gap-2">{active === action ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}{active === action ? label : fallback}</span>;
}

function State({ title, message }: { title: string; message: string }) { return <main className="mx-auto max-w-xl p-16 text-center"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-500">{message}</p></main>; }
function Card({ title, children }: { title: string; children: ReactNode }) { return <section className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm"><h2 className="mb-4 text-lg font-bold text-slate-950">{title}</h2>{children}</section>; }
function Grid({ rows }: { rows: Array<[string, string]> }) { return <dl className="grid gap-4 sm:grid-cols-2">{rows.map(([label, value]) => <div key={label}><dt className="text-xs font-semibold uppercase tracking-wide text-slate-600">{label}</dt><dd className="mt-1 break-words text-sm font-medium text-slate-900">{value}</dd></div>)}</dl>; }

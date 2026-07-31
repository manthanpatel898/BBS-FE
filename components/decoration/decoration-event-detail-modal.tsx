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
import { deleteDecorationBooking, downloadDecorationCustomerPdf, fetchDecorationBooking } from '@/lib/auth/api';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import type { DecorationBooking } from '@/lib/auth/types';
import { getDecorationDetailActions, type DecorationDetailActionId } from '@/lib/decoration/event-detail-view';
import { formatDecorationTimeRange } from '@/lib/decoration/time-format';
import { createPdfDownloadController, saveDownloadedPdf } from '@/lib/decoration/customer-document-download';
import { BookingDownloadLifecycle } from '@/lib/decoration/booking-download-lifecycle';
import { decorationCustomerRows } from '@/lib/decoration/customer-details';

const displayDate = (value: string) => new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
const money = (value: number) => `₹${value.toLocaleString('en-IN', { maximumFractionDigits: 2 })}`;

export function DecorationEventDetailModal({ bookingId, initialBooking, onClose, onUpdated, onDeleted }: { bookingId: string; initialBooking?: DecorationBooking | null; onClose?: () => void; onUpdated?: (booking: DecorationBooking) => void; onDeleted?: (bookingId: string) => void }) {
  const { accessToken } = useAuth();
  const [booking, setBooking] = useState<DecorationBooking | null>(initialBooking?.id === bookingId ? initialBooking : null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(!booking);
  const [child, setChild] = useState<'edit' | 'confirm' | 'advance' | 'followup' | 'selection' | null>(null);
  const [deleting, setDeleting] = useState(false);
  useEffect(() => {
    if (!accessToken || !bookingId) { setLoading(false); return; }
    let active = true; setError(''); setLoading((current) => current || !booking);
    fetchDecorationBooking(accessToken, bookingId).then((value) => { if (active) { setBooking(value); onUpdated?.(value); } }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load event.'); }).finally(() => { if (active) setLoading(false); });
    return () => { active = false; };
  }, [accessToken, bookingId]);
  function updated(value: DecorationBooking) { setBooking(value); onUpdated?.(value); setChild(null); }
  return <div className={onClose ? 'fixed inset-0 z-50 overflow-hidden bg-slate-900/45 p-0 backdrop-blur-sm sm:flex sm:items-center sm:justify-center sm:p-5' : ''} role={onClose ? 'dialog' : undefined} aria-modal={onClose ? true : undefined} aria-label={onClose ? 'Decoration event details' : undefined} onMouseDown={(event) => { if (onClose && event.target === event.currentTarget && !child) onClose(); }}>
    <div className={onClose ? 'relative mx-auto flex h-[100dvh] max-h-[100dvh] w-full max-w-6xl flex-col overflow-hidden bg-slate-50 shadow-2xl sm:h-[calc(100dvh-2.5rem)] sm:rounded-3xl' : ''}>
      {loading && !booking ? <State title="Loading event" message="Fetching the latest event details…" /> : !booking ? <State title="Unable to open event" message={error || 'Decoration event was not found.'} /> : <Detail booking={booking} warning={error} onClose={onClose} onAction={(action) => { if (action === 'delete') setDeleting(true); else if (action === 'edit' || action === 'confirm' || action === 'advance' || action === 'followup') setChild(action); else if (action === 'choose-decoration' || action === 'edit-decoration') setChild('selection'); }} />}
    </div>
    {child === 'edit' && booking ? <DecorationInquiryForm booking={booking} onClose={() => setChild(null)} onSaved={updated} /> : null}
    {child === 'confirm' && booking ? <DecorationConfirmationModal booking={booking} onClose={() => setChild(null)} onConfirmed={updated} /> : null}
    {child === 'advance' && booking ? <DecorationPaymentModal booking={booking} onClose={() => setChild(null)} onSaved={updated} /> : null}
    {child === 'followup' && booking ? <DecorationFollowupModal booking={booking} onClose={() => setChild(null)} onSaved={updated} /> : null}
    {child === 'selection' && booking ? <DecorationSelectionModal booking={booking} onClose={() => setChild(null)} onSaved={updated} /> : null}
    {deleting && booking ? <DeleteBookingConfirmation booking={booking} onCancel={()=>setDeleting(false)} onDeleted={()=>{setDeleting(false);onDeleted?.(booking.id);onClose?.();}} /> : null}
  </div>;
}

function DeleteBookingConfirmation({booking,onCancel,onDeleted}:{booking:DecorationBooking;onCancel:()=>void;onDeleted:()=>void}) {
  const {accessToken}=useAuth(); const[busy,setBusy]=useState(false); const[error,setError]=useState('');
  async function remove(){if(!accessToken||busy)return;setBusy(true);setError('');try{await deleteDecorationBooking(accessToken,booking.id);onDeleted();}catch(reason){setError(reason instanceof Error?reason.message:'Unable to delete this booking.');setBusy(false)}}
  return <div className="fixed inset-0 z-[90] flex items-end justify-center bg-slate-950/60 p-3 backdrop-blur-sm sm:items-center" role="alertdialog" aria-modal="true" aria-labelledby="delete-decoration-booking-title"><div className="safe-pad-bottom w-full max-w-md rounded-2xl bg-white p-5 shadow-2xl sm:p-6"><h2 id="delete-decoration-booking-title" className="text-xl font-bold text-slate-950">Permanently delete booking?</h2><p className="mt-3 text-sm leading-6 text-slate-600">This will permanently remove <strong>{booking.bookingNumber}</strong>, its advances, follow-ups, decoration selection, reservations, draft, and uploaded event photos. This cannot be undone.</p>{error?<p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</p>:null}<div className="mt-5 grid grid-cols-2 gap-3"><button type="button" disabled={busy} onClick={onCancel} className="min-h-11 rounded-xl border border-slate-200 font-semibold text-slate-700 disabled:opacity-50">Keep booking</button><button type="button" disabled={busy} onClick={()=>void remove()} className="min-h-11 rounded-xl bg-red-600 font-semibold text-white hover:bg-red-700 disabled:opacity-50">{busy?'Deleting…':'Delete permanently'}</button></div></div></div>
}

function Detail({ booking, warning, onClose, onAction }: { booking: DecorationBooking; warning: string; onClose?: () => void; onAction: (action: DecorationDetailActionId) => void }) {
  const { user } = useAuth();
  const canManageDecoration =
    (user?.role === 'company_admin' ||
      hasPermission(user, PERMISSIONS.DECORATION_SELECTION_MANAGE)) &&
    (booking.status === 'CONFIRMED' ||
      booking.status === 'DECORATION_SELECTED');
  return <section className="mx-auto flex min-h-0 w-full max-w-6xl flex-1 flex-col">
    <header data-detail-region="header" className="shrink-0 border-b border-slate-200 bg-white px-4 py-3 sm:px-6 sm:py-4">
      <div className="flex min-w-0 items-start gap-3 pr-14 sm:items-center sm:gap-5">
        <div className="min-w-0 flex-1">
          <p className="truncate text-[10px] font-bold uppercase tracking-[0.16em] text-amber-600 sm:text-xs">{booking.bookingNumber}</p>
          <h1 className="mt-0.5 break-words text-xl font-bold leading-tight text-slate-950 sm:text-2xl">{booking.customer.name}</h1>
          <p className="mt-0.5 break-words text-xs text-slate-600 sm:text-sm">{booking.eventType.name} · {displayDate(booking.startDate)}</p>
        </div>
        <DecorationStatusBadge status={booking.status} />
      </div>
      {onClose ? <button type="button" onClick={onClose} aria-label="Close Event Detail" className="absolute right-3 top-3 z-20 inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 bg-white text-2xl text-slate-500 shadow-sm transition hover:bg-slate-50 hover:text-slate-900 sm:right-5 sm:top-4">×</button> : null}
    </header>
    <div data-detail-region="content" className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-3 sm:p-4 lg:p-5">
      {warning ? <p role="alert" className="mb-3 rounded-xl border border-amber-200 bg-amber-50 p-3 text-sm text-amber-800">Latest refresh failed. Showing the already loaded booking. {warning}</p> : null}
      <div className="grid gap-3 lg:grid-cols-[minmax(0,2fr)_minmax(280px,1fr)] lg:gap-4">
        <div className="min-w-0 space-y-3 lg:space-y-4">
          <Card title="Event & Venue" compact><Grid rows={[["Event type", booking.eventType.name], ["Event Date", displayDate(booking.startDate)], ["Time", formatDecorationTimeRange(booking.startTime, booking.endTime)], ["Slot", booking.timeSlot], ["Location", booking.venue.name], ["Hall", booking.hall?.name || 'Not applicable'], ["Address", booking.address || 'Not provided'], ["Created by", booking.createdBySnapshot?.name || 'Not available']]} /></Card>
          <Card
            title={`Selected Decoration (${booking.decorationSnapshot?.length ?? 0})`}
            compact
            action={canManageDecoration ? <button type="button" onClick={() => onAction(booking.status === 'DECORATION_SELECTED' ? 'edit-decoration' : 'choose-decoration')} className="inline-flex min-h-11 items-center justify-center rounded-xl bg-amber-500 px-3 py-2 text-xs font-bold text-slate-950 shadow-sm transition hover:bg-amber-400">{booking.status === 'DECORATION_SELECTED' ? 'Edit selection' : 'Choose decoration'}</button> : null}
          ><DecorationSnapshotGallery lines={booking.decorationSnapshot ?? []} detail /></Card>
          <Card title="Advance Payments" compact><DecorationAdvanceLedger booking={booking} /></Card>
          {booking.decorationGeneralNotes?.trim() ? <Card title="General Notes" compact><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{booking.decorationGeneralNotes.trim()}</p></Card> : null}
        </div>
        <aside className="min-w-0 space-y-3 lg:space-y-4">
          <Card title="Customer" compact><Grid variant="customer" rows={decorationCustomerRows(booking.customer)} /></Card>
          <Card title="Payment Summary" compact>
            <dl className="grid grid-cols-3 gap-2 text-center lg:grid-cols-1 lg:text-left">
              {[["Package", money(booking.packageRate)], ["Received", money(booking.totalCollected)], ["Pending", money(booking.outstandingAmount)]].map(([label, value]) => <div key={label} className="min-w-0 rounded-xl bg-slate-50 px-2 py-2.5 lg:flex lg:items-center lg:justify-between lg:gap-3"><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className={`mt-1 truncate text-sm font-bold lg:mt-0 ${label === 'Received' ? 'text-emerald-700' : label === 'Pending' ? 'text-red-700' : 'text-slate-900'}`}>{value}</dd></div>)}
            </dl>
          </Card>
          <Card title={`Follow-ups (${booking.followups.length})`} compact>{booking.followups.length ? <div className="space-y-3">{booking.followups.slice().reverse().map((item) => <div key={item.id} className="border-b border-slate-100 pb-3 text-sm last:border-0 last:pb-0"><p className="whitespace-pre-wrap leading-5 text-slate-800">{item.note}</p><p className="mt-1 text-xs text-slate-500">{displayDate(item.date)} · {item.recordedBy}</p></div>)}</div> : <p className="text-sm text-slate-500">No follow-ups recorded.</p>}</Card>
          {booking.notes ? <Card title="Notes" compact><p className="whitespace-pre-wrap text-sm leading-6 text-slate-700">{booking.notes}</p></Card> : null}
        </aside>
      </div>
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
    canDelete: admin,
  });
  return <BookingDownloadActions key={`${booking.id}:${accessToken ?? ''}`} booking={booking} accessToken={accessToken ?? ''} actions={actions} onAction={onAction} />;
}

function BookingDownloadActions({ booking, accessToken, actions, onAction }: { booking: DecorationBooking; accessToken: string; actions: ReturnType<typeof getDecorationDetailActions>; onAction: (action: DecorationDetailActionId) => void }) {
  const router = useRouter();
  const [activeDocumentAction, setActiveDocumentAction] = useState<'view' | 'download' | null>(null);
  const [mobileActionsOpen, setMobileActionsOpen] = useState(false);
  return <BookingDownloadLifecycle controllerFactory={({ onBusy, onError }) => createPdfDownloadController({
    download: (signal) => downloadDecorationCustomerPdf(accessToken, booking.id, signal),
    save: saveDownloadedPdf,
    onBusy,
    onError,
  })} onBusyChange={(busy) => { if (!busy) setActiveDocumentAction((current) => current === 'download' ? null : current); }}>{({ error: downloadError, start }) => {
    const renderActions = () => actions.map((action) => {
      const className = `inline-flex min-h-11 min-w-0 items-center justify-center rounded-xl px-3 py-2.5 text-sm font-semibold shadow-sm transition focus:outline-none focus:ring-2 focus:ring-amber-300 ${action.tone === 'primary' ? 'bg-amber-500 text-slate-950 hover:bg-amber-400' : action.tone === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100' : action.tone === 'danger' ? 'border border-red-200 bg-red-50 text-red-700 hover:bg-red-100' : 'border border-slate-200 bg-white text-slate-700 hover:bg-slate-50'}`;
      const disabled = activeDocumentAction !== null;
      if (action.id === 'view') return <button key={action.id} type="button" disabled={disabled} onClick={() => {
        if (activeDocumentAction) return;
        setActiveDocumentAction('view');
        const destination = `/decoration/print?bookingId=${encodeURIComponent(booking.id)}&mode=view&returnDate=${encodeURIComponent(booking.startDate.slice(0, 10))}`;
        router.push(destination);
      }} className={`${className} disabled:cursor-wait disabled:opacity-60`}><DocumentActionLabel action={action.id} active={activeDocumentAction} fallback={action.label} /></button>;
      if (action.id === 'download') return <button key={action.id} type="button" onClick={() => { if (!activeDocumentAction) { setActiveDocumentAction('download'); start(); } }} disabled={disabled} className={`${className} disabled:cursor-wait disabled:opacity-60`}><DocumentActionLabel action="download" active={activeDocumentAction} fallback={action.label} /></button>;
      return <button key={action.id} type="button" disabled={disabled} onClick={() => { setMobileActionsOpen(false); onAction(action.id); }} className={`${className} disabled:cursor-wait disabled:opacity-60`}>{action.label}</button>;
    });
    return <div data-detail-region="actions" className="z-[60] shrink-0 border-t border-slate-200 bg-white/95 px-3 pb-[calc(0.5rem+var(--zb-safe-bottom))] pt-2 shadow-[0_-18px_35px_rgba(15,23,42,0.1)] backdrop-blur sm:px-4 sm:pb-[calc(0.75rem+var(--zb-safe-bottom))] sm:pt-3 lg:px-5">
      {downloadError ? <p role="alert" className="mx-auto mb-2 max-w-6xl rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm text-red-700">{downloadError}</p> : null}
      <div className={`grid grid-cols-2 gap-2 overflow-hidden transition-[max-height,opacity,margin] duration-200 sm:hidden ${mobileActionsOpen ? 'mb-2 max-h-[520px] opacity-100' : 'max-h-0 opacity-0'}`}>{mobileActionsOpen ? renderActions() : null}</div>
      <button type="button" aria-label={mobileActionsOpen ? 'Hide event actions' : 'Show event actions'} aria-expanded={mobileActionsOpen} onClick={() => setMobileActionsOpen((current) => !current)} className="flex min-h-11 w-full items-center justify-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:bg-slate-50 sm:hidden">Actions <span aria-hidden="true" className={`transition-transform ${mobileActionsOpen ? 'rotate-180' : ''}`}>⌃</span></button>
      <div className="hidden grid-cols-2 gap-2 sm:grid sm:grid-cols-2 min-[720px]:grid-cols-3 lg:grid-cols-4">{renderActions()}</div>
    </div>;
  }}</BookingDownloadLifecycle>;
}

function DocumentActionLabel({ action, active, fallback }: { action: 'view' | 'download'; active: 'view' | 'download' | null; fallback: string }) {
  const label = action === 'view' ? 'Opening…' : 'Downloading…';
  return <span aria-live="polite" className="inline-flex items-center justify-center gap-2">{active === action ? <span aria-hidden="true" className="h-4 w-4 animate-spin rounded-full border-2 border-current border-r-transparent" /> : null}{active === action ? label : fallback}</span>;
}

function State({ title, message }: { title: string; message: string }) { return <main className="mx-auto max-w-xl p-16 text-center"><h1 className="text-2xl font-bold">{title}</h1><p className="mt-2 text-slate-500">{message}</p></main>; }
function Card({ title, children, compact = false, action }: { title: string; children: ReactNode; compact?: boolean; action?: ReactNode }) { return <section className={`rounded-2xl border border-slate-200 bg-white shadow-sm ${compact ? 'p-3.5 sm:p-4' : 'p-5'}`}><div className={`${compact ? 'mb-3' : 'mb-4'} flex min-w-0 items-center justify-between gap-3`}><h2 className={`${compact ? 'text-base' : 'text-lg'} min-w-0 font-bold text-slate-950`}>{title}</h2>{action}</div>{children}</section>; }
function Grid({ rows, variant = 'default' }: { rows: Array<[string, string]>; variant?: 'default' | 'customer' }) { return <dl className={`grid gap-2 ${variant === 'customer' ? 'grid-cols-1 min-[420px]:grid-cols-2 lg:grid-cols-1' : 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4'}`}>{rows.map(([label, value]) => <div key={label} className={`min-w-0 rounded-xl bg-slate-50 px-3 py-2.5 ${variant === 'customer' && label === 'Address' ? 'min-[420px]:col-span-2 lg:col-span-1' : ''}`}><dt className="text-[10px] font-semibold uppercase tracking-wide text-slate-500">{label}</dt><dd className="mt-1 whitespace-pre-wrap break-words text-sm font-semibold text-slate-900">{value}</dd></div>)}</dl>; }

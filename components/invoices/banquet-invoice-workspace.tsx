'use client';

import { FormEvent, useCallback, useEffect, useMemo, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { BanquetInvoiceModal } from '@/components/bookings/banquet-invoice-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import { useToast } from '@/components/ui/toast';
import {
  downloadBanquetWorkspaceInvoice,
  fetchBanquetInvoiceWorkspace,
  fetchBanquetInvoiceWorkspaceSummary,
  fetchMyRestaurant,
  fetchOrderById,
} from '@/lib/auth/api';
import { BanquetInvoice, BanquetInvoiceSummary, Order } from '@/lib/auth/types';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import {
  DEFAULT_INVOICE_WORKSPACE_FILTERS,
  formatInvoiceMoney,
  InvoiceWorkspaceFilters,
  normalizeInvoiceWorkspaceFilters,
} from '@/lib/banquet/invoice-workspace';

const inputClass = 'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 text-sm text-slate-900 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

function localDate(value?: string | null) {
  if (!value) return '—';
  return new Date(value).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric', timeZone: 'Asia/Kolkata' });
}

function readFilters(params: URLSearchParams): InvoiceWorkspaceFilters {
  return normalizeInvoiceWorkspaceFilters({
    page: Number(params.get('page') || 1), limit: 20,
    search: params.get('search') || '',
    status: (params.get('status') || '') as InvoiceWorkspaceFilters['status'],
    invoiceFrom: params.get('invoiceFrom') || '', invoiceTo: params.get('invoiceTo') || '',
    eventFrom: params.get('eventFrom') || '', eventTo: params.get('eventTo') || '',
    sort: (params.get('sort') || 'newest') as InvoiceWorkspaceFilters['sort'],
  });
}

export function BanquetInvoiceWorkspace() {
  const { accessToken, user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { showToast } = useToast();
  const filters = useMemo(() => readFilters(searchParams), [searchParams]);
  const [draft, setDraft] = useState(filters);
  const [records, setRecords] = useState<BanquetInvoice[]>([]);
  const [summary, setSummary] = useState<BanquetInvoiceSummary | null>(null);
  const [pagination, setPagination] = useState({ page: 1, totalPages: 0, total: 0, hasPrevious: false, hasNext: false });
  const [loading, setLoading] = useState(true);
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [order, setOrder] = useState<Order | null>(null);
  const [openingId, setOpeningId] = useState<string | null>(null);
  const canView = Boolean(user && (user.role === 'company_admin' || hasPermission(user, PERMISSIONS.BOOKINGS_INVOICES_VIEW)));
  const canDownload = Boolean(user && (user.role === 'company_admin' || hasPermission(user, PERMISSIONS.BOOKINGS_INVOICES_DOWNLOAD)));
  const canIssue = Boolean(user && (user.role === 'company_admin' || hasPermission(user, PERMISSIONS.BOOKINGS_INVOICES_ISSUE)));
  const canReissue = Boolean(user && (user.role === 'company_admin' || hasPermission(user, PERMISSIONS.BOOKINGS_INVOICES_CANCEL_REISSUE)));

  useEffect(() => setDraft(filters), [filters]);

  const load = useCallback(async () => {
    if (!accessToken || !user || !canView) return;
    try {
      setLoading(true);
      const restaurant = await fetchMyRestaurant(accessToken);
      if (restaurant.businessType !== 'BANQUET' || !restaurant.billingEnabled) {
        router.replace('/access-denied');
        return;
      }
      const [list, totals] = await Promise.all([
        fetchBanquetInvoiceWorkspace(accessToken, filters),
        fetchBanquetInvoiceWorkspaceSummary(accessToken, filters),
      ]);
      setRecords(list.records);
      setPagination(list.pagination);
      setSummary(totals);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to load invoices.', 'error');
    } finally {
      setLoading(false);
    }
  }, [accessToken, canView, filters, router, showToast, user]);

  useEffect(() => {
    if (user && (!canView || user.businessType === 'EVENT_DECORATION')) {
      router.replace('/access-denied');
      return;
    }
    void load();
  }, [canView, load, router, user]);

  function navigate(next: InvoiceWorkspaceFilters) {
    const query = new URLSearchParams();
    if (next.page > 1) query.set('page', String(next.page));
    for (const key of ['search', 'status', 'invoiceFrom', 'invoiceTo', 'eventFrom', 'eventTo'] as const) {
      if (next[key]) query.set(key, next[key]);
    }
    if (next.sort !== 'newest') query.set('sort', next.sort);
    router.replace(`/invoices${query.size ? `?${query}` : ''}`, { scroll: false });
  }

  function apply(event: FormEvent) {
    event.preventDefault();
    navigate(normalizeInvoiceWorkspaceFilters({ ...draft, page: 1 }));
  }

  async function download(invoice: BanquetInvoice) {
    if (!accessToken) return;
    try {
      setDownloadingId(invoice.id);
      const result = await downloadBanquetWorkspaceInvoice(accessToken, invoice.id);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url; anchor.download = result.filename; document.body.appendChild(anchor); anchor.click(); anchor.remove();
      URL.revokeObjectURL(url);
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to download invoice.', 'error');
    } finally { setDownloadingId(null); }
  }

  async function manage(invoice: BanquetInvoice) {
    if (!accessToken) return;
    try {
      setOpeningId(invoice.id);
      setOrder(await fetchOrderById(accessToken, invoice.bookingId));
    } catch (error) {
      showToast(error instanceof Error ? error.message : 'Unable to open booking invoice.', 'error');
    } finally { setOpeningId(null); }
  }

  const statusBadge = (status: BanquetInvoice['status']) => status === 'ISSUED'
    ? 'border-emerald-200 bg-emerald-50 text-emerald-700'
    : 'border-red-200 bg-red-50 text-red-700';

  return (
    <div className="mx-auto w-full max-w-[1600px] space-y-5 p-3 sm:p-5 lg:p-7">
      <header className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
        <div><p className="text-xs font-bold uppercase tracking-[0.18em] text-amber-600">Banquet Billing</p><h1 className="mt-1 text-2xl font-black text-slate-950 sm:text-3xl">Tax Invoices</h1><p className="mt-1 text-sm text-slate-600">Find, download, and correct every issued invoice without opening the calendar.</p></div>
      </header>

      <section className="grid grid-cols-2 gap-2 lg:grid-cols-5">
        {[
          ['Issued', summary?.issuedCount ?? 0], ['Cancelled', summary?.cancelledCount ?? 0],
          ['Taxable', formatInvoiceMoney(summary?.taxableSubtotalPaise)], ['GST', formatInvoiceMoney(summary?.taxPaise)],
          ['Grand total', formatInvoiceMoney(summary?.grandTotalPaise)],
        ].map(([label, value]) => <div key={String(label)} className="min-w-0 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4"><p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{label}</p><p className="mt-1 break-words text-lg font-black text-slate-950 sm:text-xl">{value}</p></div>)}
      </section>

      <form onSubmit={apply} className="rounded-2xl border border-slate-200 bg-white p-3 shadow-sm sm:p-4">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          <label className="grid gap-1 text-xs font-bold text-slate-600 xl:col-span-2">Search invoice, customer, mobile or booking<input className={inputClass} value={draft.search} onChange={(e)=>setDraft({...draft,search:e.target.value})} placeholder="Search invoices" /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Status<select className={inputClass} value={draft.status} onChange={(e)=>setDraft({...draft,status:e.target.value as InvoiceWorkspaceFilters['status']})}><option value="">All statuses</option><option value="ISSUED">Issued</option><option value="CANCELLED">Cancelled</option></select></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Sort<select className={inputClass} value={draft.sort} onChange={(e)=>setDraft({...draft,sort:e.target.value as InvoiceWorkspaceFilters['sort']})}><option value="newest">Newest first</option><option value="oldest">Oldest first</option></select></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Invoice from<input type="date" className={inputClass} value={draft.invoiceFrom} onChange={(e)=>setDraft({...draft,invoiceFrom:e.target.value})} /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Invoice to<input type="date" className={inputClass} value={draft.invoiceTo} onChange={(e)=>setDraft({...draft,invoiceTo:e.target.value})} /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Event from<input type="date" className={inputClass} value={draft.eventFrom} onChange={(e)=>setDraft({...draft,eventFrom:e.target.value})} /></label>
          <label className="grid gap-1 text-xs font-bold text-slate-600">Event to<input type="date" className={inputClass} value={draft.eventTo} onChange={(e)=>setDraft({...draft,eventTo:e.target.value})} /></label>
        </div>
        <div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" onClick={()=>navigate(DEFAULT_INVOICE_WORKSPACE_FILTERS)} className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold text-slate-700">Clear</button><button className="min-h-11 rounded-xl bg-amber-500 px-6 font-bold text-slate-950">Apply filters</button></div>
      </form>

      <section className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
        {loading ? <div className="p-10 text-center font-semibold text-slate-500">Loading invoices…</div> : records.length === 0 ? <div className="p-10 text-center"><p className="font-bold text-slate-900">No invoices found</p><p className="mt-1 text-sm text-slate-500">Try clearing one or more filters.</p></div> : <>
          <div className="grid gap-3 p-3 md:hidden">{records.map((invoice)=><article key={invoice.id} className="rounded-2xl border border-slate-200 p-4"><div className="flex items-start justify-between gap-2"><div className="min-w-0"><p className="truncate font-black text-slate-950">{invoice.invoiceNumber}</p><p className="truncate text-sm font-semibold text-slate-700">{invoice.recipientSnapshot.name}</p></div><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusBadge(invoice.status)}`}>{invoice.status}</span></div><dl className="mt-3 grid grid-cols-2 gap-2 text-sm"><div><dt className="text-xs text-slate-500">Event</dt><dd className="font-semibold">{localDate(invoice.eventSnapshot.eventDate)}</dd></div><div><dt className="text-xs text-slate-500">Invoice date</dt><dd className="font-semibold">{localDate(invoice.issuedAt)}</dd></div><div><dt className="text-xs text-slate-500">Booking</dt><dd className="font-semibold">{invoice.eventSnapshot.bookingNumber}</dd></div><div><dt className="text-xs text-slate-500">Total</dt><dd className="font-black">{formatInvoiceMoney(invoice.totals.grandTotalPaise)}</dd></div></dl><div className="mt-4 grid grid-cols-2 gap-2"><LoadingButton type="button" isLoading={openingId===invoice.id} onClick={()=>void manage(invoice)} className="min-h-11 rounded-xl border border-slate-300 font-bold text-slate-800">Open</LoadingButton>{canDownload?<LoadingButton type="button" isLoading={downloadingId===invoice.id} onClick={()=>void download(invoice)} className="min-h-11 rounded-xl bg-amber-500 font-bold text-slate-950">Download</LoadingButton>:null}</div></article>)}</div>
          <div className="hidden overflow-x-auto md:block"><table className="w-full min-w-[900px] text-left text-sm"><thead className="bg-slate-50 text-xs uppercase tracking-wider text-slate-500"><tr>{['Invoice','Customer','Booking / Event','Issued','Status','Taxable','GST','Grand total','Actions'].map(value=><th key={value} className="px-4 py-3">{value}</th>)}</tr></thead><tbody>{records.map(invoice=><tr key={invoice.id} className="border-t border-slate-100"><td className="px-4 py-3 font-bold text-slate-950">{invoice.invoiceNumber}</td><td className="px-4 py-3"><p className="font-semibold">{invoice.recipientSnapshot.name}</p><p className="text-xs text-slate-500">{invoice.recipientSnapshot.mobile || 'No mobile'}</p></td><td className="px-4 py-3"><p className="font-semibold">{invoice.eventSnapshot.bookingNumber}</p><p className="text-xs text-slate-500">{localDate(invoice.eventSnapshot.eventDate)}</p></td><td className="px-4 py-3">{localDate(invoice.issuedAt)}</td><td className="px-4 py-3"><span className={`rounded-full border px-2 py-1 text-[10px] font-bold ${statusBadge(invoice.status)}`}>{invoice.status}</span></td><td className="px-4 py-3">{formatInvoiceMoney(invoice.totals.taxableSubtotalPaise)}</td><td className="px-4 py-3">{formatInvoiceMoney(invoice.tax?.taxPaise ?? invoice.totals.taxPaise)}</td><td className="px-4 py-3 font-bold">{formatInvoiceMoney(invoice.totals.grandTotalPaise)}</td><td className="px-4 py-3"><div className="flex gap-2"><LoadingButton type="button" isLoading={openingId===invoice.id} onClick={()=>void manage(invoice)} className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold">Open</LoadingButton>{canDownload?<LoadingButton type="button" isLoading={downloadingId===invoice.id} onClick={()=>void download(invoice)} className="min-h-10 rounded-lg bg-amber-500 px-3 font-bold text-slate-950">Download</LoadingButton>:null}</div></td></tr>)}</tbody></table></div>
        </>}
        <footer className="flex items-center justify-between border-t border-slate-200 p-3"><p className="text-sm text-slate-500">{pagination.total} invoice{pagination.total===1?'':'s'}</p><div className="flex gap-2"><button disabled={!pagination.hasPrevious} onClick={()=>navigate({...filters,page:filters.page-1})} className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-40">Previous</button><button disabled={!pagination.hasNext} onClick={()=>navigate({...filters,page:filters.page+1})} className="min-h-10 rounded-lg border border-slate-300 px-3 font-semibold disabled:opacity-40">Next</button></div></footer>
      </section>
      {order && accessToken ? <BanquetInvoiceModal accessToken={accessToken} order={order} canIssue={canIssue} canDownload={canDownload} canReissue={canReissue} onClose={()=>{setOrder(null);void load();}} /> : null}
    </div>
  );
}

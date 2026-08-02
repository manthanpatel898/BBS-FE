'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import {
  downloadBanquetInvoice,
  cancelAndReissueBanquetInvoice,
  fetchBanquetInvoicePreview,
  fetchBanquetInvoices,
  issueBanquetInvoice,
} from '@/lib/auth/api';
import {
  BanquetInvoice,
  BanquetInvoiceDiscountType,
  BanquetInvoicePreview,
  Order,
} from '@/lib/auth/types';
import { LoadingButton } from '@/components/ui/loading-button';

const fieldClass = 'w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

export function BanquetInvoiceModal({
  accessToken,
  order,
  canIssue,
  canDownload,
  canReissue,
  onClose,
}: {
  accessToken: string;
  order: Order;
  canIssue: boolean;
  canDownload: boolean;
  canReissue: boolean;
  onClose: () => void;
}) {
  const [preview, setPreview] = useState<BanquetInvoicePreview | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<BanquetInvoice | null>(null);
  const [name, setName] = useState(`${order.customer.firstName} ${order.customer.lastName}`.trim());
  const [mobile, setMobile] = useState(order.customer.phone);
  const [address, setAddress] = useState(order.customer.address ?? '');
  const [gstin, setGstin] = useState('');
  const [discountType, setDiscountType] = useState<BanquetInvoiceDiscountType>('NONE');
  const [discount, setDiscount] = useState('0');
  const [busy, setBusy] = useState(false);
  const [reissueMode, setReissueMode] = useState(false);
  const [cancellationReason, setCancellationReason] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    let active = true;
    setBusy(true);
    Promise.all([
      fetchBanquetInvoicePreview(accessToken, order.id),
      fetchBanquetInvoices(accessToken, order.id),
    ])
      .then(([nextPreview, history]) => {
        if (!active) return;
        setPreview(nextPreview);
        const issued = history.find((invoice) => invoice.status === 'ISSUED') ?? null;
        setActiveInvoice(issued);
        if (issued) {
          setName(issued.recipientSnapshot.name);
          setMobile(issued.recipientSnapshot.mobile);
          setAddress(issued.recipientSnapshot.address);
          setGstin(issued.recipientSnapshot.gstNumber ?? '');
        } else {
          setName(nextPreview.recipient.name || name);
          setMobile(nextPreview.recipient.mobile || mobile);
          setAddress(nextPreview.recipient.address || address);
        }
      })
      .catch((requestError) => {
        if (active) setError(requestError instanceof Error ? requestError.message : 'Unable to load invoice.');
      })
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [accessToken, order.id]);

  const displayedTotals = activeInvoice?.totals ?? preview?.totals;
  const money = (paise = 0) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);
  const discountValue = useMemo(() => {
    const value = Number(discount) || 0;
    return discountType === 'PERCENTAGE' ? Math.round(value * 100) : Math.round(value * 100);
  }, [discount, discountType]);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!canIssue || activeInvoice) && !reissueMode) return;
    try {
      setBusy(true);
      setError('');
      const payload = {
        customerName: name.trim(),
        customerMobile: mobile.trim(),
        customerAddress: address.trim(),
        customerGstNumber: gstin.trim() || undefined,
        discountType,
        discountValue,
      };
      const issued = reissueMode
        ? await cancelAndReissueBanquetInvoice(accessToken, order.id, {
            ...payload,
            cancellationReason: cancellationReason.trim(),
          })
        : await issueBanquetInvoice(accessToken, order.id, payload);
      setActiveInvoice(issued);
      setReissueMode(false);
      setCancellationReason('');
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to issue invoice.');
    } finally {
      setBusy(false);
    }
  }

  async function download() {
    try {
      setBusy(true);
      setError('');
      const result = await downloadBanquetInvoice(accessToken, order.id);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to download invoice.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="modal-viewport-pad fixed inset-0 z-[80] flex items-center justify-center bg-slate-950/55 px-3 backdrop-blur-sm sm:px-5">
      <section className="flex max-h-[calc(100dvh-1.5rem)] w-full max-w-4xl flex-col overflow-hidden rounded-2xl border border-slate-200 bg-white text-slate-950 shadow-2xl sm:max-h-[calc(100dvh-3rem)]">
        <header className="flex shrink-0 items-start justify-between border-b border-slate-200 px-4 py-4 sm:px-6">
          <div><p className="text-[10px] font-bold uppercase tracking-[0.2em] text-amber-600">Banquet Tax Invoice</p><h2 className="mt-1 text-xl font-bold">{activeInvoice?.invoiceNumber ?? order.orderId}</h2><p className="mt-1 text-sm text-slate-600">Billing details are saved as a permanent invoice snapshot.</p></div>
          <button type="button" onClick={onClose} className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 text-xl text-slate-600">×</button>
        </header>
        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="app-scrollbar min-h-0 flex-1 overflow-y-auto p-4 sm:p-6">
            {error ? <div className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-medium text-red-700">{error}</div> : null}
            <div className="grid gap-3 sm:grid-cols-2">
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Billing name<input className={fieldClass} value={name} onChange={(e)=>setName(e.target.value)} disabled={Boolean(activeInvoice) && !reissueMode} required /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Mobile<input className={fieldClass} value={mobile} onChange={(e)=>setMobile(e.target.value)} disabled={Boolean(activeInvoice) && !reissueMode} required /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">Billing address<textarea className={`${fieldClass} resize-y`} rows={3} value={address} onChange={(e)=>setAddress(e.target.value)} disabled={Boolean(activeInvoice) && !reissueMode} required /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Customer GSTIN (optional)<input className={fieldClass} value={gstin} onChange={(e)=>setGstin(e.target.value.toUpperCase())} disabled={Boolean(activeInvoice) && !reissueMode} maxLength={15} /></label>
              <div className="grid grid-cols-2 gap-2">
                <label className="grid gap-1 text-sm font-semibold text-slate-700">Discount<select className={fieldClass} value={discountType} onChange={(e)=>setDiscountType(e.target.value as BanquetInvoiceDiscountType)} disabled={Boolean(activeInvoice) && !reissueMode}><option value="NONE">None</option><option value="FIXED">Fixed amount</option><option value="PERCENTAGE">Percentage</option></select></label>
                <label className="grid gap-1 text-sm font-semibold text-slate-700">Value<input className={fieldClass} inputMode="decimal" value={discount} onChange={(e)=>setDiscount(e.target.value)} disabled={(Boolean(activeInvoice) && !reissueMode) || discountType==='NONE'} /></label>
              </div>
              {reissueMode ? <label className="grid gap-1 text-sm font-semibold text-red-700 sm:col-span-2">Reason for cancelling current invoice<textarea className={`${fieldClass} resize-y`} value={cancellationReason} onChange={(e)=>setCancellationReason(e.target.value)} minLength={3} required /></label> : null}
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              {(activeInvoice?.lines ?? preview?.lines ?? []).map((line, index)=><div key={`${line.description}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><div><p className="font-semibold text-slate-900">{line.description}</p><p className="text-xs text-slate-500">{line.quantity} × {money(line.unitRatePaise)}</p></div><p className="font-semibold">{money(line.amountPaise)}</p></div>)}
            </div>
            {displayedTotals ? <div className="mt-4 ml-auto grid max-w-md gap-2 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>Taxable amount</span><b>{money(displayedTotals.taxableSubtotalPaise)}</b></div><div className="flex justify-between"><span>GST</span><b>{money(displayedTotals.taxPaise)}</b></div><div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span>Grand total</span><b>{money(displayedTotals.grandTotalPaise)}</b></div><div className="flex justify-between text-emerald-700"><span>Advance received</span><b>{money(displayedTotals.advanceReceivedPaise)}</b></div><div className="flex justify-between text-red-700"><span>Pending</span><b>{money(displayedTotals.balancePendingPaise)}</b></div></div> : null}
          </div>
          <footer className="safe-pad-bottom flex shrink-0 flex-col-reverse gap-2 border-t border-slate-200 bg-white p-4 sm:flex-row sm:justify-end sm:px-6">
            <button type="button" onClick={onClose} className="min-h-11 rounded-xl border border-slate-300 px-5 font-semibold text-slate-700">Close</button>
            {activeInvoice && canReissue && !reissueMode ? <button type="button" onClick={()=>setReissueMode(true)} className="min-h-11 rounded-xl border border-red-200 px-5 font-semibold text-red-700">Correct &amp; reissue</button> : null}
            {reissueMode ? <LoadingButton type="submit" isLoading={busy} className="min-h-11 rounded-xl bg-red-600 px-5 font-bold text-white">Cancel &amp; issue replacement</LoadingButton> : null}
            {activeInvoice && canDownload && !reissueMode ? <LoadingButton type="button" isLoading={busy} onClick={()=>void download()} className="min-h-11 rounded-xl bg-amber-500 px-5 font-bold text-slate-950">Download PDF</LoadingButton> : !activeInvoice ? <LoadingButton type="submit" isLoading={busy} disabled={!canIssue} className="min-h-11 rounded-xl bg-amber-500 px-5 font-bold text-slate-950 disabled:opacity-50">Issue invoice</LoadingButton> : null}
          </footer>
        </form>
      </section>
    </div>
  );
}

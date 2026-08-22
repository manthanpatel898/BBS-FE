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
import { calculateInvoicePreviewTotals } from '@/lib/banquet/invoice-calculation';
import { buildBanquetInvoiceIssuePayload } from '@/lib/banquet/invoice-issuance';
import { useToast } from '@/components/ui/toast';

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
  const { showToast } = useToast();
  const [preview, setPreview] = useState<BanquetInvoicePreview | null>(null);
  const [activeInvoice, setActiveInvoice] = useState<BanquetInvoice | null>(null);
  const [history, setHistory] = useState<BanquetInvoice[]>([]);
  const [name, setName] = useState(`${order.customer.firstName} ${order.customer.lastName}`.trim());
  const [mobile, setMobile] = useState(order.customer.phone);
  const [address, setAddress] = useState(order.customer.address ?? '');
  const [state, setState] = useState('');
  const [country, setCountry] = useState('India');
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
        setHistory(history);
        if (issued) {
          setName(issued.recipientSnapshot.name);
          setMobile(issued.recipientSnapshot.mobile);
          setAddress(issued.recipientSnapshot.address);
          setState(issued.recipientSnapshot.state ?? '');
          setCountry(issued.recipientSnapshot.country || 'India');
          setGstin(issued.recipientSnapshot.gstNumber ?? '');
        } else {
          setName(nextPreview.recipient.name || name);
          setMobile(nextPreview.recipient.mobile || mobile);
          setAddress(nextPreview.recipient.address || address);
          setState(nextPreview.recipient.state || '');
          setCountry(nextPreview.recipient.country || 'India');
          setDiscountType(nextPreview.discount.type);
          setDiscount(
            nextPreview.discount.type === 'PERCENTAGE'
              ? String(nextPreview.discount.value / 100)
              : nextPreview.discount.type === 'FIXED'
                ? String(nextPreview.discount.value / 100)
                : '0',
          );
        }
      })
      .catch((requestError) => {
        if (!active) return;
        const message = requestError instanceof Error ? requestError.message : 'Unable to load invoice.';
        setError(message);
        showToast(message, 'error');
      })
      .finally(() => active && setBusy(false));
    return () => { active = false; };
  }, [accessToken, order.id, showToast]);

  const discountValue = useMemo(() => {
    const value = Number(discount) || 0;
    return discountType === 'PERCENTAGE' ? Math.round(value * 100) : Math.round(value * 100);
  }, [discount, discountType]);
  const displayedTotals = useMemo(
    () =>
      activeInvoice && !reissueMode
        ? activeInvoice.totals
        : preview
          ? calculateInvoicePreviewTotals(preview, discountType, discountValue)
          : null,
    [activeInvoice, discountType, discountValue, preview, reissueMode],
  );
  const money = (paise = 0) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR' }).format(paise / 100);

  async function submit(event: FormEvent) {
    event.preventDefault();
    if ((!canIssue || activeInvoice) && !reissueMode) return;
    try {
      setBusy(true);
      setError('');
      const payload = buildBanquetInvoiceIssuePayload({
        customerName: name,
        customerMobile: mobile,
        customerAddress: address,
        customerState: state,
        customerCountry: country,
        customerGstNumber: gstin,
        discountType,
        discountValue,
      });
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
      const message = requestError instanceof Error ? requestError.message : 'Unable to issue invoice.';
      setError(message);
      showToast(message, 'error');
    } finally {
      setBusy(false);
    }
  }

  async function download(invoiceId?: string) {
    try {
      setBusy(true);
      setError('');
      const result = await downloadBanquetInvoice(accessToken, order.id, invoiceId);
      const url = URL.createObjectURL(result.blob);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = result.filename;
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      URL.revokeObjectURL(url);
    } catch (requestError) {
      const message = requestError instanceof Error ? requestError.message : 'Unable to download invoice.';
      setError(message);
      showToast(message, 'error');
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
              {preview ? <div className="rounded-xl border border-slate-200 bg-slate-50 p-4 sm:col-span-2"><p className="text-xs font-bold uppercase tracking-wider text-amber-700">Bill From</p><p className="mt-1 font-bold text-slate-950">{preview.supplier.legalName}</p><p className="mt-1 whitespace-pre-line text-sm text-slate-600">{preview.supplier.address}</p><p className="mt-1 text-sm text-slate-600">GSTIN: {preview.supplier.gstNumber} · PAN: {preview.supplier.panNumber}</p></div> : null}
              <p className="text-xs font-bold uppercase tracking-wider text-amber-700 sm:col-span-2">Bill To</p>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Billing name<input className={fieldClass} value={name} onChange={(e)=>setName(e.target.value)} disabled={Boolean(activeInvoice) && !reissueMode} required /></label>
              <label className="grid gap-1 text-sm font-semibold text-slate-700">Mobile (optional)<input className={fieldClass} value={mobile} onChange={(e)=>setMobile(e.target.value)} disabled={Boolean(activeInvoice) && !reissueMode} /></label>
              <details className="rounded-xl border border-slate-200 bg-slate-50 sm:col-span-2" open={reissueMode || undefined}>
                <summary className="cursor-pointer select-none px-4 py-3 text-sm font-bold text-slate-800">Additional billing details <span className="font-normal text-slate-500">(optional)</span></summary>
                <div className="grid gap-3 border-t border-slate-200 p-4 sm:grid-cols-2">
                  <label className="grid gap-1 text-sm font-semibold text-slate-700 sm:col-span-2">Billing address (optional)<textarea className={`${fieldClass} resize-y`} rows={3} value={address} onChange={(e)=>setAddress(e.target.value)} disabled={Boolean(activeInvoice) && !reissueMode} /></label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">Customer GSTIN (optional)<input className={fieldClass} value={gstin} onChange={(e)=>setGstin(e.target.value.toUpperCase())} disabled={Boolean(activeInvoice) && !reissueMode} maxLength={15} /></label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">State {gstin ? '(required)' : '(optional)'}<input className={fieldClass} value={state} onChange={(e)=>setState(e.target.value)} disabled={Boolean(activeInvoice) && !reissueMode} required={Boolean(gstin)} /></label>
                  <label className="grid gap-1 text-sm font-semibold text-slate-700">Country<input className={fieldClass} value={country} onChange={(e)=>setCountry(e.target.value)} disabled={Boolean(activeInvoice) && !reissueMode} required /></label>
                  <div className="grid grid-cols-2 gap-2">
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">Discount (optional)<select className={fieldClass} value={discountType} onChange={(e)=>setDiscountType(e.target.value as BanquetInvoiceDiscountType)} disabled={Boolean(activeInvoice) && !reissueMode}><option value="NONE">None</option><option value="FIXED">Fixed amount</option><option value="PERCENTAGE">Percentage</option></select></label>
                    <label className="grid gap-1 text-sm font-semibold text-slate-700">Value<input className={fieldClass} inputMode="decimal" value={discount} onChange={(e)=>setDiscount(e.target.value)} disabled={(Boolean(activeInvoice) && !reissueMode) || discountType==='NONE'} /></label>
                  </div>
                </div>
              </details>
              {reissueMode ? <label className="grid gap-1 text-sm font-semibold text-red-700 sm:col-span-2">Reason for cancelling current invoice<textarea className={`${fieldClass} resize-y`} value={cancellationReason} onChange={(e)=>setCancellationReason(e.target.value)} minLength={3} required /></label> : null}
            </div>
            <div className="mt-5 overflow-hidden rounded-xl border border-slate-200">
              {(activeInvoice?.lines ?? preview?.lines ?? []).map((line, index)=><div key={`${line.description}-${index}`} className="grid grid-cols-[1fr_auto] gap-3 border-b border-slate-100 px-4 py-3 last:border-0"><div><p className="font-semibold text-slate-900">{line.description}</p><p className="text-xs text-slate-500">{line.quantity} × {money(line.unitRatePaise)}</p></div><p className="font-semibold">{money(line.amountPaise)}</p></div>)}
            </div>
            {displayedTotals ? <div className="mt-4 ml-auto grid max-w-md gap-2 rounded-xl bg-slate-50 p-4 text-sm"><div className="flex justify-between"><span>Taxable amount</span><b>{money(displayedTotals.taxableSubtotalPaise)}</b></div>{preview?.taxMode==='CGST_SGST'?<><div className="flex justify-between"><span>CGST</span><b>{money(displayedTotals.cgstPaise)}</b></div><div className="flex justify-between"><span>SGST</span><b>{money(displayedTotals.sgstPaise)}</b></div></>:<div className="flex justify-between"><span>IGST</span><b>{money(displayedTotals.igstPaise)}</b></div>}<div className="flex justify-between border-t border-slate-200 pt-2 text-base"><span>Grand total</span><b>{money(displayedTotals.grandTotalPaise)}</b></div>{preview?.amountInWords?<p className="border-t border-slate-200 pt-2 text-xs font-semibold text-slate-600">{preview.amountInWords}</p>:null}</div> : null}
            {preview?.bank ? <div className="mt-4 rounded-xl border border-slate-200 p-4 text-sm text-slate-700"><p className="font-bold text-slate-950">Company&apos;s Bank Details</p><p>{preview.bank.accountHolderName} · {preview.bank.bankName}</p><p>A/c: {preview.bank.accountNumber} · {preview.bank.branchName} / {preview.bank.ifscCode}</p></div> : null}
            {history.some((invoice)=>invoice.status==='CANCELLED') && canDownload ? <div className="mt-5 rounded-xl border border-slate-200 p-4"><p className="text-sm font-bold text-slate-900">Invoice history</p><div className="mt-2 grid gap-2">{history.filter((invoice)=>invoice.status==='CANCELLED').map((invoice)=><button type="button" key={invoice.id} onClick={()=>void download(invoice.id)} className="flex min-h-11 items-center justify-between rounded-xl bg-slate-50 px-3 text-left text-sm text-slate-700"><span>{invoice.invoiceNumber}</span><span className="font-semibold">Download cancelled copy</span></button>)}</div></div> : null}
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

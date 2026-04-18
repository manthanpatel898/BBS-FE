'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { BookingsRoute } from '@/components/auth/bookings-route';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { CommonModal } from '@/components/ui/common-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  addDineInUsage,
  addNextBookingUsage,
  fetchCustomerWallet,
  processAdvancePayout,
  setCancelAdvanceOption,
} from '@/lib/auth/api';
import {
  CancelAdvanceManagement,
  CancelAdvanceOption,
  CustomerWalletItem,
} from '@/lib/auth/types';

// ── Shared styles ──────────────────────────────────────────────────────────────
const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';
const ghostBtn =
  'rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50';

type Notice = { type: 'success' | 'error'; message: string } | null;

function formatCurrency(v: number) {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(v);
}

function formatDate(v: string | Date | null | undefined) {
  if (!v) return '—';
  return new Date(v).toLocaleDateString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

function formatDateTime(v: string | Date | null | undefined) {
  if (!v) return '—';
  return new Date(v).toLocaleString('en-IN', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

// ── Status badge ────────────────────────────────────────────────────────────────
function StatusBadge({ status }: { status: string }) {
  const map: Record<string, string> = {
    PENDING_OPTION: 'bg-amber-100 text-amber-700',
    ACTIVE: 'bg-emerald-100 text-emerald-700',
    SETTLED: 'bg-blue-100 text-blue-700',
    FORFEITED: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    PENDING_OPTION: 'Pending Option',
    ACTIVE: 'Active',
    SETTLED: 'Settled',
    FORFEITED: 'Forfeited',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[status] ?? 'bg-slate-100 text-slate-700'}`}>
      {labels[status] ?? status}
    </span>
  );
}

function OptionBadge({ option }: { option: string | null }) {
  if (!option) return <span className="text-sm text-slate-400">Not set</span>;
  const map: Record<string, string> = {
    DINE_IN: 'bg-emerald-100 text-emerald-700',
    PAY_BACK: 'bg-blue-100 text-blue-700',
    NEXT_BOOKING: 'bg-violet-100 text-violet-700',
    NO_PAY_BACK: 'bg-red-100 text-red-700',
  };
  const labels: Record<string, string> = {
    DINE_IN: 'Dine In',
    PAY_BACK: 'Pay Back',
    NEXT_BOOKING: 'Next Booking',
    NO_PAY_BACK: 'No Pay Back',
  };
  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-medium ${map[option] ?? 'bg-slate-100 text-slate-700'}`}>
      {labels[option] ?? option}
    </span>
  );
}

// ── View Modal ──────────────────────────────────────────────────────────────────
function WalletViewModal({
  item,
  onClose,
  onUpdated,
}: {
  item: CustomerWalletItem;
  onClose: () => void;
  onUpdated: () => void;
}) {
  const { accessToken } = useAuth();
  const cam = item.cancelAdvanceManagement;

  const [notice, setNotice] = useState<Notice>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Change option
  const [showChangeOption, setShowChangeOption] = useState(false);
  const [newOption, setNewOption] = useState<CancelAdvanceOption | null>(null);
  const [newExpiryMonths, setNewExpiryMonths] = useState<number | null>(null);
  const [newExpiryCustomDate, setNewExpiryCustomDate] = useState('');

  // Dine-in usage form
  const [dineInAmount, setDineInAmount] = useState('');
  const [dineInNote, setDineInNote] = useState('');
  const [isDineInModalOpen, setIsDineInModalOpen] = useState(false);

  // Payout form
  const [payoutMode, setPayoutMode] = useState<'CASH' | 'ONLINE'>('CASH');
  const [payoutDate, setPayoutDate] = useState('');
  const [payoutNote, setPayoutNote] = useState('');

  // Next booking form
  const [nextAmount, setNextAmount] = useState('');
  const [nextDate, setNextDate] = useState('');
  const [nextNote, setNextNote] = useState('');

  async function handleChangeOption() {
    if (!accessToken || !newOption) return;
    let expiryDate: string | undefined;
    if (newOption === 'DINE_IN' || newOption === 'NEXT_BOOKING') {
      if (newExpiryCustomDate) {
        expiryDate = newExpiryCustomDate;
      } else if (newExpiryMonths) {
        const d = new Date();
        d.setMonth(d.getMonth() + newExpiryMonths);
        expiryDate = d.toISOString().split('T')[0];
      }
    }
    try {
      setIsSubmitting(true);
      await setCancelAdvanceOption(accessToken, item.id, { option: newOption, expiryDate });
      setNotice({ type: 'success', message: 'Option updated successfully.' });
      setShowChangeOption(false);
      onUpdated();
    } catch (e) {
      setNotice({ type: 'error', message: e instanceof Error ? e.message : 'Failed to update option.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddDineIn(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    try {
      setIsSubmitting(true);
      await addDineInUsage(accessToken, item.id, {
        amount: Number(dineInAmount),
        date: new Date().toISOString().split('T')[0],
        note: dineInNote || undefined,
      });
      setNotice({ type: 'success', message: 'Dine-in usage recorded.' });
      setDineInAmount(''); setDineInNote('');
      setIsDineInModalOpen(false);
      onUpdated();
    } catch (e) {
      setNotice({ type: 'error', message: e instanceof Error ? e.message : 'Failed to record dine-in usage.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handlePayout(e: FormEvent) {
    e.preventDefault();
    if (!accessToken || !cam) return;
    try {
      setIsSubmitting(true);
      await processAdvancePayout(accessToken, item.id, {
        amount: cam.remainingBalance,
        mode: payoutMode,
        date: payoutDate || undefined,
        note: payoutNote || undefined,
      });
      setNotice({ type: 'success', message: 'Payout processed successfully.' });
      setPayoutDate(''); setPayoutNote('');
      onUpdated();
    } catch (e) {
      setNotice({ type: 'error', message: e instanceof Error ? e.message : 'Failed to process payout.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleAddNextBooking(e: FormEvent) {
    e.preventDefault();
    if (!accessToken) return;
    try {
      setIsSubmitting(true);
      await addNextBookingUsage(accessToken, item.id, {
        amount: Number(nextAmount),
        date: nextDate || undefined,
        note: nextNote || undefined,
      });
      setNotice({ type: 'success', message: 'Next booking usage recorded.' });
      setNextAmount(''); setNextDate(''); setNextNote('');
      onUpdated();
    } catch (e) {
      setNotice({ type: 'error', message: e instanceof Error ? e.message : 'Failed to record next booking usage.' });
    } finally {
      setIsSubmitting(false);
    }
  }

  const canChangeOption =
    cam &&
    (cam.option === 'DINE_IN' || cam.option === 'NEXT_BOOKING') &&
    cam.status === 'ACTIVE' &&
    cam.remainingBalance > 0 &&
    cam.payoutEntry == null &&
    !(
      cam.option === 'DINE_IN'
        ? (cam.nextBookingUsages?.length ?? 0) > 0
        : (cam.dineInUsages?.length ?? 0) > 0
    );

  const ledgerRows = useMemo(() => {
    const rows = [
      ...item.advancePayments.map((payment, index) => ({
        id: `payment-${payment.id ?? `${payment.createdAt ?? payment.date}-${payment.amount}-${index}`}`,
        date: payment.date,
        type: 'Advance Received',
        amount: payment.amount,
        effect: payment.amount,
        note: `${payment.paymentMode}${payment.remark ? ` • ${payment.remark}` : ''}`,
        recordedByName: payment.recordedByName,
        createdAt: payment.createdAt,
      })),
      ...(cam?.dineInUsages ?? []).map((entry, index) => ({
        id: `dinein-${entry.id ?? `${entry.createdAt ?? entry.date}-${entry.amount}-${index}`}`,
        date: entry.date,
        type: 'Dine-In Used',
        amount: entry.amount,
        effect: -entry.amount,
        note: entry.note || '-',
        recordedByName: entry.acceptedByName,
        createdAt: entry.createdAt,
      })),
      ...(cam?.payoutEntry
        ? [{
            id: 'payout-entry',
            date: cam.payoutEntry.date,
            type: 'Payout Processed',
            amount: cam.payoutEntry.amount,
            effect: -cam.payoutEntry.amount,
            note: `${cam.payoutEntry.mode}${cam.payoutEntry.note ? ` • ${cam.payoutEntry.note}` : ''}`,
            recordedByName: cam.payoutEntry.processedByName,
            createdAt: cam.payoutEntry.createdAt,
          }]
        : []),
      ...(cam?.nextBookingUsages ?? []).map((entry, index) => ({
        id: `next-${entry.id ?? `${entry.createdAt ?? entry.date}-${entry.amount}-${index}`}`,
        date: entry.date,
        type: 'Next Booking Applied',
        amount: entry.amount,
        effect: -entry.amount,
        note: entry.note || '-',
        recordedByName: entry.processedByName,
        createdAt: entry.createdAt,
      })),
      ...(cam?.forfeitedAt
        ? [{
            id: 'forfeited-entry',
            date: cam.forfeitedAt,
            type: 'Forfeited Advance',
            amount: cam.forfeitedAmount ?? 0,
            effect: -(cam.forfeitedAmount ?? 0),
            note: cam.forfeitedReason ? cam.forfeitedReason.replace(/_/g, ' ') : '-',
            recordedByName: cam.forfeitedByName ?? 'System',
            createdAt: cam.forfeitedAt,
          }]
        : []),
    ].sort((a, b) => {
      const createdAtDiff = new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
      if (createdAtDiff !== 0) {
        return createdAtDiff;
      }

      return a.id.localeCompare(b.id);
    });

    let runningBalance = 0;
    return rows.map((row) => {
      runningBalance += row.effect;
      return { ...row, runningBalance };
    });
  }, [cam, item.advancePayments]);

  return (
    <CommonModal
      title={`Customer Wallet ${item.orderId}`}
      description="Customer, booking, advance payment, and treasury-style wallet activity."
      onClose={onClose}
      widthClassName="max-w-5xl"
    >
      <div className="space-y-6">
          {notice && (
            <div className={`rounded-xl px-4 py-3 text-sm ${notice.type === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
              {notice.message}
            </div>
          )}

          <div className="grid gap-4 lg:grid-cols-2">
            <InfoCard title="Booking Info">
              <InfoLine label="Booking Id" value={item.orderId} />
              <InfoLine label="Booking Date" value={formatDate(item.bookingDate)} />
              <InfoLine label="Function Date" value={formatDate(item.eventDate)} />
              <InfoLine label="Cancel Date" value={formatDate(item.cancelDate)} />
              <InfoLine label="Cancel Reason" value={item.cancelReason?.trim() || '—'} />
            </InfoCard>
            <InfoCard title="Customer Info">
              <InfoLine label="Customer" value={item.customerName} />
              <InfoLine label="Mobile" value={item.customerPhone} />
              <InfoLine label="Initial Advance" value={formatCurrency(item.advanceAmount)} />
              <InfoLine label="Option" value={cam?.option ? optionLabel(cam.option) : 'Not set'} />
              <InfoLine label="Remaining Balance" value={formatCurrency(cam?.remainingBalance ?? 0)} />
              <InfoLine label="Status" value={statusLabel(cam?.status ?? 'PENDING_OPTION')} />
            </InfoCard>
          </div>

          {cam && (
            <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-slate-200 bg-white px-5 py-4">
              <div className="flex items-center gap-3">
                <span className="text-sm text-slate-500">Option:</span>
                <OptionBadge option={cam.option} />
                <StatusBadge status={cam.status} />
                {cam.expiryDate && (
                  <span className="text-xs text-slate-400">Expires: {formatDate(cam.expiryDate)}</span>
                )}
              </div>
              <div className="text-right">
                <p className="text-xs text-slate-500">Remaining Balance</p>
                <p className={`text-xl font-bold ${cam.remainingBalance > 0 ? 'text-emerald-600' : 'text-slate-400'}`}>
                  {formatCurrency(cam.remainingBalance)}
                </p>
              </div>
              {canChangeOption && (
                <button
                  onClick={() => setShowChangeOption((v) => !v)}
                  className="text-xs font-medium text-amber-600 hover:text-amber-700 underline"
                >
                  Change Option
                </button>
              )}
            </div>
          )}

          {/* Change option inline */}
          {showChangeOption && (
            <div className="rounded-xl border border-amber-200 bg-amber-50 p-4 space-y-3">
              <p className="text-sm font-semibold text-amber-800">Change Advance Option</p>
              <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                {(['DINE_IN', 'PAY_BACK', 'NEXT_BOOKING', 'NO_PAY_BACK'] as const).map((opt) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => setNewOption(opt)}
                    className={`rounded-lg border px-3 py-2 text-xs font-medium transition ${newOption === opt ? 'border-amber-500 bg-amber-100 text-amber-800' : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300'}`}
                  >
                    {opt.replace(/_/g, ' ')}
                  </button>
                ))}
              </div>
              {(newOption === 'DINE_IN' || newOption === 'NEXT_BOOKING') && (
                <div>
                  <p className="mb-2 text-xs text-amber-700">Choose expiry</p>
                  <div className="flex flex-wrap gap-2">
                    {[1, 3, 6, 9, 12].map((m) => (
                      <button key={m} type="button" onClick={() => { setNewExpiryMonths(m); setNewExpiryCustomDate(''); }}
                        className={`rounded-lg border px-3 py-1.5 text-xs font-medium transition ${newExpiryMonths === m && !newExpiryCustomDate ? 'border-amber-500 bg-amber-100 text-amber-700' : 'border-slate-200 bg-white text-slate-600'}`}>
                        {m}M
                      </button>
                    ))}
                    <input type="date" value={newExpiryCustomDate} min={new Date().toISOString().split('T')[0]}
                      onChange={(e) => { setNewExpiryCustomDate(e.target.value); setNewExpiryMonths(null); }}
                      className="rounded-lg border border-slate-200 px-2 py-1 text-xs" />
                  </div>
                </div>
              )}
              <div className="flex gap-3">
                <button onClick={() => setShowChangeOption(false)} className={ghostBtn}>Cancel</button>
                <LoadingButton isLoading={isSubmitting} onClick={handleChangeOption} disabled={!newOption || isSubmitting}
                  className="rounded-xl bg-amber-500 px-4 py-2 text-sm font-medium text-white hover:bg-amber-600">
                  Save
                </LoadingButton>
              </div>
            </div>
          )}

          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5">
            <div className="flex items-center justify-between gap-3">
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">
                Treasury Report
              </p>
              {cam?.option === 'DINE_IN' && cam.status === 'ACTIVE' ? (
                <button
                  type="button"
                  onClick={() => setIsDineInModalOpen(true)}
                  className="rounded-xl bg-amber-400 px-4 py-2 text-sm font-semibold text-white transition hover:bg-amber-500"
                >
                  Add Dine-In Usage
                </button>
              ) : null}
            </div>

            <div className="mt-4 overflow-x-auto rounded-2xl border border-amber-100 bg-white">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-amber-50 text-slate-500">
                  <tr>
                    <th className="px-4 py-3 font-medium">Date</th>
                    <th className="px-4 py-3 font-medium">Type</th>
                    <th className="px-4 py-3 font-medium">Amount</th>
                    <th className="px-4 py-3 font-medium">Balance</th>
                    <th className="px-4 py-3 font-medium">Note</th>
                    <th className="px-4 py-3 font-medium">Recorded By</th>
                  </tr>
                </thead>
                <tbody>
                  {ledgerRows.length > 0 ? (
                    ledgerRows.map((row) => (
                      <tr key={row.id} className="border-t border-amber-100">
                        <td className="px-4 py-3 text-slate-700 whitespace-nowrap">{formatDateTime(row.createdAt || row.date)}</td>
                        <td className="px-4 py-3 text-slate-700">{row.type}</td>
                        <td className={`px-4 py-3 font-medium ${row.effect >= 0 ? 'text-emerald-700' : 'text-red-600'}`}>
                          {row.effect >= 0 ? '+' : '-'}{formatCurrency(Math.abs(row.amount))}
                        </td>
                        <td className="px-4 py-3 font-medium text-slate-900">
                          {formatCurrency(row.runningBalance)}
                        </td>
                        <td className="px-4 py-3 text-slate-700">{row.note}</td>
                        <td className="px-4 py-3 text-slate-700">{row.recordedByName}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan={6} className="px-4 py-6 text-center text-slate-500">
                        No treasury entries recorded.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {cam && cam.option && (
            <div className="space-y-4">
              {cam.option === 'DINE_IN' && (
                <>
                  {cam.dineInUsages.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {['Date', 'Amount Used', 'Note', 'Accepted By', 'Balance After'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cam.dineInUsages.map((u, index) => (
                            <tr key={u.id ?? `dinein-${u.createdAt ?? u.date}-${u.amount}-${index}`} className="bg-white">
                              <td className="px-4 py-3 text-slate-700">{formatDate(u.date)}</td>
                              <td className="px-4 py-3 font-semibold text-red-600">-{formatCurrency(u.amount)}</td>
                              <td className="px-4 py-3 text-slate-500">{u.note ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-700">{u.acceptedByName}</td>
                              <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(u.remainingAfter)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic mb-3">No dine-in usages recorded yet.</p>
                  )}
                </>
              )}

              {/* Pay Back */}
              {cam.option === 'PAY_BACK' && (
                <>
                  {cam.payoutEntry ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {['Date', 'Amount', 'Method', 'Note', 'Processed By'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          <tr className="bg-white">
                            <td className="px-4 py-3 text-slate-700">{formatDate(cam.payoutEntry.date)}</td>
                            <td className="px-4 py-3 font-semibold text-red-600">-{formatCurrency(cam.payoutEntry.amount)}</td>
                            <td className="px-4 py-3 text-slate-700">{cam.payoutEntry.mode}</td>
                            <td className="px-4 py-3 text-slate-500">{cam.payoutEntry.note ?? '—'}</td>
                            <td className="px-4 py-3 text-slate-700">{cam.payoutEntry.processedByName}</td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic mb-3">No payout processed yet.</p>
                  )}

                  {cam.status === 'ACTIVE' && !cam.payoutEntry && (
                    <form onSubmit={handlePayout} className="mt-4 rounded-xl border border-blue-200 bg-blue-50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-blue-800">
                        Process Payout — {formatCurrency(cam.remainingBalance)}
                      </p>
                      <div className="flex gap-3">
                        {(['CASH', 'ONLINE'] as const).map((m) => (
                          <button key={m} type="button" onClick={() => setPayoutMode(m)}
                            className={`rounded-lg border px-4 py-2 text-sm font-medium transition ${payoutMode === m ? 'border-blue-500 bg-blue-100 text-blue-700' : 'border-slate-200 bg-white text-slate-700'}`}>
                            {m}
                          </button>
                        ))}
                      </div>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="date" value={payoutDate} onChange={(e) => setPayoutDate(e.target.value)} className={inputCls} />
                        <input type="text" placeholder="Note (optional)" value={payoutNote}
                          onChange={(e) => setPayoutNote(e.target.value)} className={inputCls} />
                      </div>
                      <LoadingButton isLoading={isSubmitting} type="submit" disabled={isSubmitting}
                        className="rounded-xl bg-blue-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-blue-700">
                        Process Payout
                      </LoadingButton>
                    </form>
                  )}
                </>
              )}

              {/* Next Booking */}
              {cam.option === 'NEXT_BOOKING' && (
                <>
                  {cam.nextBookingUsages.length > 0 ? (
                    <div className="overflow-hidden rounded-xl border border-slate-200">
                      <table className="w-full text-sm">
                        <thead className="bg-slate-50">
                          <tr>
                            {['Date', 'Amount Applied', 'Note', 'Processed By', 'Balance After'].map((h) => (
                              <th key={h} className="px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-slate-500">{h}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100">
                          {cam.nextBookingUsages.map((u, index) => (
                            <tr key={u.id ?? `next-${u.createdAt ?? u.date}-${u.amount}-${index}`} className="bg-white">
                              <td className="px-4 py-3 text-slate-700">{formatDate(u.date)}</td>
                              <td className="px-4 py-3 font-semibold text-red-600">-{formatCurrency(u.amount)}</td>
                              <td className="px-4 py-3 text-slate-500">{u.note ?? '—'}</td>
                              <td className="px-4 py-3 text-slate-700">{u.processedByName}</td>
                              <td className="px-4 py-3 font-semibold text-emerald-700">{formatCurrency(u.remainingAfter)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  ) : (
                    <p className="text-sm text-slate-400 italic mb-3">No next booking usages recorded yet.</p>
                  )}

                  {cam.status === 'ACTIVE' && (
                    <form onSubmit={handleAddNextBooking} className="mt-4 rounded-xl border border-violet-200 bg-violet-50 p-4 space-y-3">
                      <p className="text-sm font-semibold text-violet-800">Apply to Next Booking</p>
                      <div className="grid grid-cols-2 gap-3">
                        <input type="number" required min={1} max={cam.remainingBalance} placeholder="Amount" value={nextAmount}
                          onChange={(e) => setNextAmount(e.target.value)} className={inputCls} />
                        <input type="date" value={nextDate} onChange={(e) => setNextDate(e.target.value)} className={inputCls} />
                      </div>
                      <input type="text" placeholder="Note (optional)" value={nextNote}
                        onChange={(e) => setNextNote(e.target.value)} className={inputCls} />
                      <LoadingButton isLoading={isSubmitting} type="submit" disabled={!nextAmount || isSubmitting}
                        className="rounded-xl bg-violet-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-violet-700">
                        Record Usage
                      </LoadingButton>
                    </form>
                  )}
                </>
              )}

              {/* No Pay Back / Forfeited */}
              {(cam.option === 'NO_PAY_BACK' || cam.status === 'FORFEITED') && cam.forfeitedAt && (
                <div className="rounded-xl border border-red-200 bg-red-50 p-4">
                  <p className="text-sm font-semibold text-red-700">Forfeited Advance</p>
                  <p className="mt-1 text-sm text-red-600">
                    {formatCurrency(cam.forfeitedAmount ?? 0)} forfeited on {formatDate(cam.forfeitedAt)}
                    {cam.forfeitedReason && (
                      <span className="ml-2 text-xs text-red-500">
                        ({cam.forfeitedReason.replace(/_/g, ' ')})
                      </span>
                    )}
                  </p>
                </div>
              )}
            </div>
          )}
      </div>

      {isDineInModalOpen && cam?.option === 'DINE_IN' ? (
        <CommonModal
          title={`Add Dine-In Usage ${item.orderId}`}
          description="Record a dine-in usage against this customer's available wallet balance."
          onClose={() => {
            setIsDineInModalOpen(false);
            setDineInAmount('');
            setDineInNote('');
          }}
          widthClassName="max-w-md"
        >
          <form onSubmit={handleAddDineIn} className="space-y-4">
            <div className="rounded-xl border border-emerald-200 bg-emerald-50 p-4">
              <p className="text-xs font-semibold uppercase tracking-wide text-emerald-700">
                Available Balance
              </p>
              <p className="mt-2 text-2xl font-bold text-emerald-700">
                {formatCurrency(cam.remainingBalance)}
              </p>
            </div>
            <input
              type="number"
              required
              min={1}
              max={cam.remainingBalance}
              placeholder="Amount"
              value={dineInAmount}
              onChange={(e) => setDineInAmount(e.target.value)}
              className={inputCls}
            />
            <input
              type="text"
              placeholder="Note (optional)"
              value={dineInNote}
              onChange={(e) => setDineInNote(e.target.value)}
              className={inputCls}
            />
            <div className="flex justify-end gap-3">
              <button
                type="button"
                onClick={() => {
                  setIsDineInModalOpen(false);
                  setDineInAmount('');
                  setDineInNote('');
                }}
                className={ghostBtn}
              >
                Cancel
              </button>
              <LoadingButton
                isLoading={isSubmitting}
                type="submit"
                disabled={!dineInAmount || isSubmitting}
                className="rounded-xl bg-emerald-600 px-4 py-2.5 text-sm font-medium text-white hover:bg-emerald-700"
              >
                Record Dine-In
              </LoadingButton>
            </div>
          </form>
        </CommonModal>
      ) : null}
    </CommonModal>
  );
}

// ── Main Page ───────────────────────────────────────────────────────────────────
export default function CustomerWalletPage() {
  useAppPageHeader({
    eyebrow: 'Customer Wallet',
    title: 'Customer Wallet',
  });
  const { accessToken } = useAuth();
  const [items, setItems] = useState<CustomerWalletItem[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [total, setTotal] = useState(0);
  const [searchInput, setSearchInput] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [isLoading, setIsLoading] = useState(true);
  const [notice, setNotice] = useState<Notice>(null);
  const [viewItem, setViewItem] = useState<CustomerWalletItem | null>(null);

  async function loadWallet(p = page, s = search, st = statusFilter) {
    if (!accessToken) return;
    try {
      setIsLoading(true);
      const result = await fetchCustomerWallet(accessToken, { page: p, limit: 20, search: s, status: st || undefined });
      setItems(result.items);
      setTotalPages(result.pagination.totalPages);
      setTotal(result.pagination.total);
    } catch (e) {
      setNotice({ type: 'error', message: e instanceof Error ? e.message : 'Failed to load customer wallet.' });
    } finally {
      setIsLoading(false);
    }
  }

  useEffect(() => {
    void loadWallet(1, search, statusFilter);
    setPage(1);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [accessToken, search, statusFilter]);

  function handleSearch(e: FormEvent) {
    e.preventDefault();
    setSearch(searchInput.trim());
  }

  return (
    <BookingsRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-1 text-sm text-slate-500">
              Manage advance amounts from cancelled bookings
            </p>
          </div>
          <form onSubmit={handleSearch} className="flex w-full max-w-xl flex-col gap-2 sm:flex-row">
            <input
              type="text"
              placeholder="Search by booking id, customer, or phone"
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className={inputCls}
            />
            <LoadingButton
              type="submit"
              isLoading={isLoading && search !== searchInput.trim()}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
            >
              Search
            </LoadingButton>
          </form>
        </div>

        {notice && (
          <div className={`mb-6 rounded-xl px-4 py-3 text-sm ${notice.type === 'success' ? 'border border-emerald-200 bg-emerald-50 text-emerald-700' : 'border border-red-200 bg-red-50 text-red-700'}`}>
            {notice.message}
          </div>
        )}

        <div className="flex flex-wrap items-center justify-between gap-3">
          <span className="rounded-full bg-amber-100 px-3 py-1 text-sm font-medium text-amber-700">
            {total} {total === 1 ? 'entry' : 'entries'}
          </span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm text-slate-700 outline-none focus:border-amber-400"
          >
            <option value="">All Status</option>
            <option value="PENDING_OPTION">Pending Option</option>
            <option value="ACTIVE">Active</option>
            <option value="SETTLED">Settled</option>
            <option value="FORFEITED">Forfeited</option>
          </select>
        </div>

        {/* Table */}
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-slate-50 text-slate-500">
                <tr>
                  <th className="px-5 py-3.5 font-medium">Booking</th>
                  <th className="px-5 py-3.5 font-medium">Customer</th>
                  <th className="px-5 py-3.5 font-medium">Event</th>
                  <th className="px-5 py-3.5 font-medium">Advance Paid</th>
                  <th className="px-5 py-3.5 font-medium">Option</th>
                  <th className="px-5 py-3.5 font-medium">Available Balance</th>
                  <th className="px-5 py-3.5 font-medium">Status</th>
                  <th className="px-5 py-3.5 font-medium text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {isLoading ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                      Loading wallet entries…
                    </td>
                  </tr>
                ) : items.length === 0 ? (
                  <tr>
                    <td colSpan={8} className="px-5 py-8 text-center text-slate-500">
                      No wallet entries found.
                    </td>
                  </tr>
                ) : (
                  items.map((item) => {
                    const cam = item.cancelAdvanceManagement;
                    return (
                      <tr key={item.orderId} className="border-t border-slate-100">
                        <td className="px-5 py-4">
                          <p className="font-semibold text-slate-900">{item.orderId}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Booking: {formatDate(item.bookingDate)} • Cancelled: {formatDate(item.cancelDate)}
                          </p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            Reason: {item.cancelReason?.trim() || 'Not provided'}
                          </p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          <p>{item.customerName}</p>
                          <p className="mt-0.5 text-xs text-slate-400">{item.customerPhone}</p>
                        </td>
                        <td className="px-5 py-4 text-slate-700">
                          <p>{item.eventDate ? formatDate(item.eventDate) : 'Date pending'}</p>
                          <p className="mt-0.5 text-xs text-slate-400">
                            {item.advancePayments.length} advance {item.advancePayments.length === 1 ? 'entry' : 'entries'}
                          </p>
                        </td>
                        <td className="px-5 py-4 font-medium text-slate-900">{formatCurrency(item.advanceAmount)}</td>
                        <td className="px-5 py-4"><OptionBadge option={cam?.option ?? null} /></td>
                        <td className="px-5 py-4 font-medium text-slate-900">
                          {formatCurrency(cam?.remainingBalance ?? 0)}
                        </td>
                        <td className="px-5 py-4">
                          <StatusBadge status={cam?.status ?? 'PENDING_OPTION'} />
                        </td>
                        <td className="px-5 py-4 text-right">
                          <LoadingButton
                            type="button"
                            onClick={() => setViewItem(item)}
                            className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-50"
                          >
                            View
                          </LoadingButton>
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>

          {/* Pagination */}
          {totalPages > 1 && (
            <div className="flex items-center justify-between border-t border-slate-100 px-6 py-4">
              <p className="text-sm text-slate-500">
                Page {page} of {totalPages}
              </p>
              <div className="flex gap-2">
                <button disabled={page <= 1} onClick={() => { setPage(page - 1); void loadWallet(page - 1); }} className={ghostBtn}>
                  Previous
                </button>
                <button disabled={page >= totalPages} onClick={() => { setPage(page + 1); void loadWallet(page + 1); }} className={ghostBtn}>
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </section>

      {viewItem && (
        <WalletViewModal
          item={viewItem}
          onClose={() => setViewItem(null)}
          onUpdated={() => {
            void loadWallet(page, search, statusFilter);
            setViewItem(null);
          }}
        />
      )}
    </BookingsRoute>
  );
}

function InfoCard({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white p-5 shadow-sm">
      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{title}</p>
      <div className="mt-4 space-y-3">{children}</div>
    </div>
  );
}

function InfoLine({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-slate-100 pb-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-slate-500">{label}</span>
      <span className="text-right text-sm font-medium text-slate-900">{value}</span>
    </div>
  );
}

function optionLabel(option: string) {
  return option.replace(/_/g, ' ').replace(/\b\w/g, (char) => char.toUpperCase());
}

function statusLabel(status: string) {
  if (status === 'PENDING_OPTION') return 'Pending Option';
  return optionLabel(status);
}

'use client';

import { useCallback, useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { LoadingButton } from '@/components/ui/loading-button';
import {
  acceptIncomingPartnerInquiry,
  applyIncomingPartnerInquiryUpdate,
  declineIncomingPartnerInquiry,
  fetchIncomingPartnerInquiries,
  fetchPartnerInquiryPolicy,
} from '@/lib/auth/api';
import type { PartnerInquiry, PartnerInquiryStatus } from '@/lib/auth/types';
import { incomingInquiryUrl, normalizeIncomingInquiryStatus } from '@/lib/decoration/incoming-inquiries';

const tabs: Array<{ value: PartnerInquiryStatus; label: string }> = [
  { value: 'PENDING', label: 'Pending' },
  { value: 'ACCEPTED', label: 'Accepted' },
  { value: 'DECLINED', label: 'Declined' },
  { value: 'WITHDRAWN', label: 'Withdrawn' },
];

function formatDate(value: string) {
  return new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium' }).format(new Date(value));
}

export default function IncomingInquiriesPage() {
  useAppPageHeader({ eyebrow: 'Event Decoration', title: 'Incoming Inquiries' });
  const { accessToken } = useAuth();
  const router = useRouter();
  const params = useSearchParams();
  const status = normalizeIncomingInquiryStatus(params.get('status'));
  const [items, setItems] = useState<PartnerInquiry[]>([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [selected, setSelected] = useState<PartnerInquiry | null>(null);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [declineReason, setDeclineReason] = useState('');
  const [showDecline, setShowDecline] = useState(false);
  const [policyNotice, setPolicyNotice] = useState<{ version: string; summary: string } | null>(null);

  const load = useCallback(async (requestedPage = 1, append = false) => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      const result = await fetchIncomingPartnerInquiries(accessToken, {
        status,
        page: requestedPage,
        limit: 20,
      });
      setItems((current) => append ? [...current, ...result.items] : result.items);
      setPage(result.pagination.page);
      setTotalPages(result.pagination.totalPages);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to load incoming inquiries.');
    } finally {
      setLoading(false);
    }
  }, [accessToken, status]);

  useEffect(() => { void load(1); }, [load]);
  useEffect(() => {
    if (!accessToken) return;
    void fetchPartnerInquiryPolicy(accessToken)
      .then((policy) => setPolicyNotice({ version: policy.version, summary: policy.summary }))
      .catch(() => setPolicyNotice(null));
  }, [accessToken]);

  function changeTab(next: PartnerInquiryStatus) {
    router.replace(incomingInquiryUrl(next), { scroll: false });
    setSelected(null);
    setShowDecline(false);
    setDeclineReason('');
  }

  async function accept() {
    if (!accessToken || !selected) return;
    setBusy(true);
    setError('');
    try {
      await acceptIncomingPartnerInquiry(accessToken, selected.id);
      window.dispatchEvent(new Event('partner-inquiries-changed'));
      setSelected(null);
      await load(1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to accept inquiry.');
    } finally {
      setBusy(false);
    }
  }

  async function decline() {
    if (!accessToken || !selected) return;
    setBusy(true);
    setError('');
    try {
      await declineIncomingPartnerInquiry(accessToken, selected.id, declineReason);
      window.dispatchEvent(new Event('partner-inquiries-changed'));
      setSelected(null);
      setShowDecline(false);
      setDeclineReason('');
      await load(1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to decline inquiry.');
    } finally {
      setBusy(false);
    }
  }

  async function applyUpdate() {
    if (!accessToken || !selected) return;
    setBusy(true);
    try {
      const updated = await applyIncomingPartnerInquiryUpdate(accessToken, selected.id);
      setSelected(updated);
      await load(1);
    } catch (requestError) {
      setError(requestError instanceof Error ? requestError.message : 'Unable to apply source update.');
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="space-y-5 text-slate-950">
      <div>
        <p className="max-w-3xl text-sm leading-6 text-slate-600">
          Banquet partners share confirmed events here. Accept an inquiry to add it to your calendar and standard follow-up workflow.
        </p>
      </div>
      {policyNotice ? (
        <div className="rounded-2xl border border-blue-200 bg-blue-50 px-4 py-3 text-sm leading-6 text-blue-950">
          <span className="font-semibold">Data-sharing policy {policyNotice.version}:</span>{' '}
          {policyNotice.summary}
        </div>
      ) : null}

      <div className="overflow-x-auto rounded-2xl border border-slate-200 bg-white p-1">
        <div className="flex min-w-max gap-1">
          {tabs.map((tab) => (
            <button key={tab.value} type="button" onClick={() => changeTab(tab.value)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold ${status === tab.value ? 'bg-slate-950 text-white' : 'text-slate-600 hover:bg-slate-50'}`}>
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {error ? <div className="rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700">{error}</div> : null}

      {loading && !items.length ? (
        <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-600">Loading incoming inquiries…</div>
      ) : items.length ? (
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {items.map((inquiry) => (
            <button key={inquiry.id} type="button" onClick={() => setSelected(inquiry)} className="min-w-0 rounded-3xl border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-300 hover:shadow-md">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="truncate text-lg font-bold text-slate-950">{inquiry.payload.customerName}</p>
                  <p className="mt-1 truncate text-sm text-slate-600">{inquiry.payload.eventType}</p>
                </div>
                {inquiry.unread ? <span className="mt-1 h-2.5 w-2.5 shrink-0 rounded-full bg-red-500" aria-label="Unread" /> : null}
              </div>
              <div className="mt-4 space-y-2 border-t border-slate-100 pt-4 text-sm text-slate-700">
                <p><span className="font-semibold text-slate-950">Date:</span> {formatDate(inquiry.payload.eventDate)}</p>
                <p><span className="font-semibold text-slate-950">From:</span> {inquiry.sourceCompany.name}</p>
                <p><span className="font-semibold text-slate-950">Location:</span> {inquiry.payload.venueName}{inquiry.payload.hallName ? ` / ${inquiry.payload.hallName}` : ''}</p>
              </div>
              {inquiry.hasSourceUpdates ? <p className="mt-4 rounded-xl bg-amber-50 px-3 py-2 text-xs font-semibold text-amber-800">Source booking updated</p> : null}
            </button>
          ))}
        </div>
      ) : (
        <div className="rounded-3xl border border-dashed border-slate-300 bg-white p-10 text-center">
          <p className="font-semibold text-slate-950">No {status.toLowerCase()} incoming inquiries</p>
          <p className="mt-1 text-sm text-slate-600">New eligible inquiries will appear here automatically.</p>
        </div>
      )}
      {page < totalPages ? (
        <div className="flex justify-center">
          <LoadingButton
            type="button"
            isLoading={loading}
            disabled={loading}
            onClick={() => void load(page + 1, true)}
            className="rounded-xl border border-slate-300 bg-white px-5 py-3 font-semibold text-slate-950"
          >
            Load more
          </LoadingButton>
        </div>
      ) : null}

      {selected ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/55 p-0 backdrop-blur-sm sm:items-center sm:p-5">
          <section role="dialog" aria-modal="true" aria-labelledby="incoming-title" className="flex max-h-[92dvh] w-full max-w-3xl flex-col overflow-hidden rounded-t-3xl bg-white shadow-2xl sm:rounded-3xl">
            <header className="flex items-start justify-between gap-4 border-b border-slate-200 p-5 sm:p-6">
              <div>
                <p className="text-xs font-bold uppercase tracking-widest text-amber-600">{selected.sourceCompany.name}</p>
                <h2 id="incoming-title" className="mt-1 text-2xl font-bold text-slate-950">{selected.payload.customerName}</h2>
                <p className="mt-1 text-sm text-slate-600">{selected.sourceBookingNumber}</p>
              </div>
              <button type="button" onClick={() => { setSelected(null); setShowDecline(false); setDeclineReason(''); }} className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-slate-200 text-2xl text-slate-600">×</button>
            </header>
            <div className="flex-1 overflow-y-auto p-5 sm:p-6">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ['Mobile', selected.payload.mobile],
                  ['Event Type', selected.payload.eventType],
                  ['Date', formatDate(selected.payload.eventDate)],
                  ['Time', `${selected.payload.startTime} – ${selected.payload.endTime}`],
                  ['Time Slot', selected.payload.timeSlot],
                  ['Banquet / Venue', selected.payload.venueName],
                  ['Hall', selected.payload.hallName || 'Not specified'],
                  ['Address', selected.payload.address || 'Not specified'],
                ].map(([label, value]) => (
                  <div key={label} className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                    <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</p>
                    <p className="mt-1 break-words font-semibold text-slate-950">{value}</p>
                  </div>
                ))}
              </div>
              {selected.payload.sharedNote ? <div className="mt-3 rounded-2xl border border-slate-200 p-4"><p className="text-xs font-semibold uppercase tracking-wider text-slate-500">Partner note</p><p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-800">{selected.payload.sharedNote}</p></div> : null}
              {selected.sourceChanges.some((change) => change.type === 'WITHDRAWAL') ? (
                <div className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm leading-6 text-red-800">
                  <p className="font-bold">Source booking notice</p>
                  <p>
                    {String(selected.sourceChanges.find((change) => change.type === 'WITHDRAWAL')?.message ?? 'The banquet has withdrawn this decoration requirement.')}
                  </p>
                </div>
              ) : null}
              {showDecline ? <div className="mt-4"><label className="text-sm font-semibold text-slate-950">Decline reason (optional)</label><textarea value={declineReason} maxLength={1000} onChange={(event) => setDeclineReason(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-300 bg-white p-3 text-slate-950 outline-none focus:border-amber-400" /></div> : null}
            </div>
            <footer className="border-t border-slate-200 bg-white p-4 sm:p-5">
              {selected.status === 'PENDING' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {showDecline ? <LoadingButton type="button" isLoading={busy} disabled={busy} onClick={() => void decline()} className="rounded-xl bg-red-600 px-5 py-3 font-semibold text-white">Confirm decline</LoadingButton> : <button type="button" onClick={() => setShowDecline(true)} className="rounded-xl border border-red-200 px-5 py-3 font-semibold text-red-700">Decline</button>}
                  <LoadingButton type="button" isLoading={busy} disabled={busy} onClick={() => void accept()} className="rounded-xl bg-emerald-500 px-5 py-3 font-semibold text-white hover:bg-emerald-600">Accept inquiry</LoadingButton>
                </div>
              ) : selected.status === 'ACCEPTED' ? (
                <div className="grid gap-3 sm:grid-cols-2">
                  {selected.sourceChanges.some((change) => change.type === 'UPDATE') ? <LoadingButton type="button" isLoading={busy} disabled={busy} onClick={() => void applyUpdate()} className="rounded-xl bg-amber-400 px-5 py-3 font-semibold text-slate-950">Apply source changes</LoadingButton> : <div />}
                  <button
                    type="button"
                    onClick={() => {
                      const date = selected.payload.eventDate.slice(0, 10);
                      router.push(`/decoration/events?date=${date}&bookingId=${selected.acceptedBookingId}`);
                    }}
                    className="rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white"
                  >
                    Open event booking
                  </button>
                </div>
              ) : <button type="button" onClick={() => setSelected(null)} className="w-full rounded-xl bg-slate-950 px-5 py-3 font-semibold text-white">Close</button>}
            </footer>
          </section>
        </div>
      ) : null}
    </div>
  );
}

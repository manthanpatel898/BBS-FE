'use client';

import { useEffect, useState } from 'react';
import { generateBookingFeedbackLink, getBookingFeedbackState, updateBookingFeedbackNote } from '@/lib/booking-feedback/api';
import type { BookingFeedbackState } from '@/lib/booking-feedback/types';

type Props = { accessToken: string; orderId: string; customerName: string; eventType?: string | null; eventDate?: string | null; onClose: () => void };
type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null;
const noticeClass = { success: 'border-emerald-200 bg-emerald-50 text-emerald-800', error: 'border-red-200 bg-red-50 text-red-700', info: 'border-amber-200 bg-amber-50 text-amber-800' };

function formatEventDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

export function BookingFeedbackModal({ accessToken, orderId, customerName, eventType, eventDate, onClose }: Props) {
  const [state, setState] = useState<BookingFeedbackState | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    getBookingFeedbackState(accessToken, orderId).then((value) => {
      setState(value); setNote(value.response?.internalNote ?? '');
    }).catch((reason) => setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to load feedback.' }));
  }, [accessToken, orderId]);

  async function generate(regenerate = false) {
    setBusy(true); setNotice(null); setCopied(false);
    try {
      const result = await generateBookingFeedbackLink(accessToken, orderId, regenerate);
      setLink(result.link); setState(await getBookingFeedbackState(accessToken, orderId)); setConfirmReplacement(false);
      setNotice({ tone: 'success', text: regenerate ? 'Replacement link generated.' : 'Feedback link generated.' });
    } catch (reason) { setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to create link.' }); }
    finally { setBusy(false); }
  }

  async function copyLink() {
    try { await navigator.clipboard.writeText(link); setCopied(true); setNotice({ tone: 'success', text: 'Feedback link copied. It is ready to share.' }); }
    catch { setNotice({ tone: 'error', text: 'Unable to copy automatically. Select and copy the link manually.' }); }
  }

  async function saveNote() {
    setBusy(true); setNotice(null);
    try { await updateBookingFeedbackNote(accessToken, orderId, note); setNotice({ tone: 'success', text: 'Internal note saved.' }); }
    catch (reason) { setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to save note.' }); }
    finally { setBusy(false); }
  }

  const status = !state ? 'Loading' : state.state === 'SUBMITTED' ? 'Received' : state.state === 'PENDING' ? 'Waiting' : 'Not generated';
  const formattedDate = formatEventDate(eventDate);

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="booking-feedback-title">
    <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-7"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Booking feedback</p><h2 id="booking-feedback-title" className="mt-2 text-2xl font-black text-slate-950">Request feedback · {customerName}</h2><p className="mt-1 text-sm text-slate-500">{[eventType, formattedDate, `Booking ${orderId.slice(-6).toUpperCase()}`].filter(Boolean).join(' · ')}</p></div><button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-300 text-xl text-slate-600 hover:bg-slate-50" aria-label="Close">×</button></header>
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Feedback status</p><span className={`rounded-full px-3 py-1 text-xs font-black ${status === 'Received' ? 'bg-emerald-100 text-emerald-800' : status === 'Waiting' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{status}</span></div>
        {!state ? <div className="mt-6 animate-pulse space-y-3 rounded-2xl border border-slate-200 p-5"><div className="h-5 w-1/2 rounded bg-slate-200"/><div className="h-4 w-4/5 rounded bg-slate-100"/></div> : state.state === 'SUBMITTED' && state.response ? <>
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><p className="text-sm font-bold text-emerald-800">Feedback received</p><div className="mt-2 flex flex-wrap items-end justify-between gap-2"><p className="text-3xl font-black text-emerald-950">{state.response.averageRating.toFixed(1)} / 5</p><p className="text-xs font-semibold text-emerald-800">{state.response.answers.length} question{state.response.answers.length === 1 ? '' : 's'} answered · {new Date(state.response.submittedAt).toLocaleDateString('en-IN')}</p></div></div>
          <div className="mt-4 space-y-3">{state.response.answers.map((answer) => <div key={answer.questionId} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-800">{answer.questionText}</p><p className="mt-2 font-bold text-amber-600" aria-label={`${answer.rating} out of 5 stars`}>{'★'.repeat(answer.rating)}<span className="text-slate-200">{'★'.repeat(5 - answer.rating)}</span><span className="ml-2 text-sm text-slate-600">{answer.rating}/5</span></p></div>)}</div>
          {state.response.comment ? <section className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer comment</p><p className="mt-2 text-sm leading-6 text-slate-800">{state.response.comment}</p></section> : null}
          <section className="mt-5 border-t border-slate-200 pt-5"><label className="block text-sm font-bold text-slate-800">Internal note <span className="font-normal text-slate-500">· visible only to your team</span><textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"/></label><button type="button" disabled={busy} onClick={() => void saveNote()} className="mt-3 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Saving…' : 'Save internal note'}</button></section>
        </> : <>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5"><p className="font-bold text-slate-950">{state.state === 'PENDING' ? 'Waiting for customer response' : 'No feedback link generated yet'}</p><p className="mt-2 text-sm leading-6 text-slate-600">{state.state === 'PENDING' ? 'The secure link has been generated. For security, it cannot be displayed again.' : 'Generate a secure, single-use link and share it with the customer.'}</p></div>
          {link ? <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Copy this link before closing</p><p className="mt-1 text-xs text-amber-700">For security, the full link will not be shown again.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label="Generated feedback link" readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-slate-800"/><button type="button" onClick={() => void copyLink()} className="rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950">{copied ? 'Copied' : 'Copy link'}</button></div></section> : null}
          <div className="mt-4">{state.state === 'PENDING' ? <button type="button" disabled={busy} onClick={() => setConfirmReplacement(true)} className="w-full rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-50 sm:w-auto">Generate replacement link</button> : <button type="button" disabled={busy} onClick={() => void generate(false)} className="w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Generating…' : 'Generate secure link'}</button>}</div>
        </>}
        {notice ? <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${noticeClass[notice.tone]}`}>{notice.text}</p> : null}
      </div>
    </div>
    {confirmReplacement ? <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/60 p-5"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="replace-feedback-link-title"><h3 id="replace-feedback-link-title" className="text-xl font-black text-slate-950">Replace the existing link?</h3><p className="mt-2 text-sm leading-6 text-slate-600">The previously shared link will stop working immediately. Generate a replacement only when the customer needs a new link.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={() => setConfirmReplacement(false)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">Keep current link</button><button type="button" disabled={busy} onClick={() => void generate(true)} className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Generating…' : 'Generate replacement'}</button></div></div></div> : null}
  </div>;
}

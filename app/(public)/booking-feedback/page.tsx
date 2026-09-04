'use client';

import { useEffect, useRef, useState } from 'react';
import { submitPublicBookingFeedback, validatePublicBookingFeedback } from '@/lib/booking-feedback/api';
import { buildBookingFeedbackAnswers } from '@/lib/booking-feedback/domain';
import type { PublicBookingFeedback } from '@/lib/booking-feedback/types';
import { FEEDBACK_CONTROL_CLASS } from '@/lib/booking-feedback/ui';

const ratingLabels = ['', 'Poor', 'Fair', 'Good', 'Very good', 'Excellent'];
const formatDate = (value?: string) => value ? new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'long', year: 'numeric' }).format(new Date(value)) : null;
const TOKEN_STORAGE_KEY = 'booking_feedback_token';

export default function BookingFeedbackPage() {
  const [token, setToken] = useState('');
  const [data, setData] = useState<PublicBookingFeedback | null>(null);
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [confirmed, setConfirmed] = useState(false);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const errorRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    const url = new URL(window.location.href);
    const value =
      url.searchParams.get('token') ||
      sessionStorage.getItem(TOKEN_STORAGE_KEY) ||
      localStorage.getItem(TOKEN_STORAGE_KEY) ||
      '';
    if (value) {
      sessionStorage.setItem(TOKEN_STORAGE_KEY, value);
      localStorage.setItem(TOKEN_STORAGE_KEY, value);
      url.searchParams.delete('token');
      window.history.replaceState({}, '', `${url.pathname}${url.search}${url.hash}`);
    }
    setToken(value);
    if (value) validatePublicBookingFeedback(value).then(setData).catch((reason) => setError(reason instanceof Error ? reason.message : 'Invalid feedback link.'));
  }, []);

  useEffect(() => { if (error) errorRef.current?.scrollIntoView({ behavior: 'smooth', block: 'center' }); }, [error]);

  if (!token || error && !data || data && data.status !== 'READY') {
    const submitted = data?.status === 'SUBMITTED';
    const expired = data?.status === 'EXPIRED';
    return <main className="grid min-h-dvh place-items-center bg-[linear-gradient(135deg,#fffaf0,#f8fafc)] p-5"><div className="w-full max-w-xl rounded-3xl border border-slate-200 bg-white p-8 text-center shadow-xl"><div className={`mx-auto grid h-16 w-16 place-items-center rounded-2xl text-3xl ${submitted ? 'bg-emerald-50 text-emerald-600' : 'bg-red-50 text-red-600'}`}>{submitted ? '✓' : '!'}</div><h1 className="mt-5 text-3xl font-black text-slate-950">{submitted ? 'Thank you for your feedback' : expired ? 'Feedback link expired' : 'Invalid feedback link'}</h1><p className="mt-3 leading-6 text-slate-500">{submitted ? 'Your response has been securely received. We appreciate you taking the time to share your experience.' : expired ? 'Please contact the venue and ask for a new feedback link.' : error || 'Please use the exact feedback link shared with you.'}</p></div></main>;
  }
  if (!data) return <main className="grid min-h-dvh place-items-center bg-slate-50"><div className="text-center"><div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-slate-200 border-t-amber-500"/><p className="mt-4 font-semibold text-slate-600">Preparing your feedback form…</p></div></main>;

  async function submit() {
    let answers;
    try { answers = buildBookingFeedbackAnswers(data?.questions ?? [], ratings); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Please answer at least one question.'); return; }
    if (!confirmed) { setError('Please confirm that this feedback is based on your event experience.'); return; }
    setBusy(true); setError('');
    try { await submitPublicBookingFeedback(token, { answers, comment: comment.trim() || undefined, confirmed: true }); sessionStorage.removeItem(TOKEN_STORAGE_KEY); localStorage.removeItem(TOKEN_STORAGE_KEY); setData({ status: 'SUBMITTED' }); }
    catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to submit feedback.'); }
    finally { setBusy(false); }
  }

  const answered = Object.keys(ratings).length;
  const total = data.questions?.length ?? 0;
  const eventDate = formatDate(data.booking?.eventDate);

  return <main data-feedback-surface="true" className="min-h-dvh bg-[linear-gradient(135deg,#fffaf0,#f8fafc)] px-4 py-6 pb-28 sm:py-14 sm:pb-14"><div className="mx-auto max-w-2xl overflow-hidden rounded-3xl border border-slate-200 bg-white shadow-2xl">
    <header className="border-b border-slate-100 p-5 sm:p-9">{data.branding?.logoUrl ? <img src={data.branding.logoUrl} alt={`${data.branding.name} logo`} className="mb-5 h-16 max-w-48 object-contain object-left"/> : null}<p className="text-xs font-black uppercase tracking-[0.22em] text-amber-600">{data.branding?.name || 'Banquet feedback'}</p><h1 className="mt-3 text-3xl font-black text-slate-950 sm:text-4xl">Tell us about your event</h1><p className="mt-2 font-semibold text-slate-700">{data.booking?.customerName}</p><p className="mt-1 text-sm text-slate-500">{[data.booking?.eventType, eventDate].filter(Boolean).join(' · ')}</p></header>
    <div className="p-5 sm:p-9"><section className="rounded-2xl border border-amber-200 bg-amber-50 p-4"><div className="flex items-center justify-between gap-3"><p className="text-sm font-bold text-amber-900">Rate at least one question</p><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-amber-800">{answered} of {total} answered</span></div><div className="mt-3 h-2 overflow-hidden rounded-full bg-amber-100"><div className="h-full rounded-full bg-amber-500 transition-all" style={{ width: `${total ? answered / total * 100 : 0}%` }}/></div><p className="mt-2 text-xs text-amber-800">All other questions are optional.</p></section>
      <div className="mt-5 space-y-4">{data.questions?.map((question, index) => { const selected = ratings[question.id] || 0; return <section key={question.id} className="rounded-2xl border border-slate-200 p-4 sm:p-5"><p className="font-bold leading-6 text-slate-900"><span className="mr-2 text-amber-600">{index + 1}.</span>{question.text}</p><div role="radiogroup" aria-label={`Rating for ${question.text}`} className="mt-4 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((star) => <button type="button" role="radio" aria-checked={selected === star} key={star} onClick={() => { setRatings((values) => ({ ...values, [question.id]: star })); setError(''); }} className={`min-h-14 rounded-xl border text-xl font-black transition ${star <= selected ? 'border-amber-300 bg-amber-100 text-amber-500' : 'border-slate-200 bg-slate-50 text-slate-300 hover:border-amber-200'}`} aria-label={`${star} stars, ${ratingLabels[star]}`}>★<span className="block text-[10px] font-bold text-slate-600">{star}</span></button>)}</div>{selected ? <div className="mt-3 flex items-center justify-between gap-3"><p className="text-sm font-bold text-amber-700">{ratingLabels[selected]} · {selected}/5</p><button type="button" onClick={() => setRatings((values) => { const next = { ...values }; delete next[question.id]; return next; })} className="text-xs font-semibold text-slate-500 underline">Clear answer</button></div> : null}</section>; })}</div>
      <label className="mt-5 block font-bold text-slate-700">Anything else you would like to share? <span className="font-normal text-slate-500">(optional)</span><textarea value={comment} maxLength={1200} onChange={(event) => setComment(event.target.value)} className={`${FEEDBACK_CONTROL_CLASS} mt-2 min-h-28 w-full rounded-2xl border border-slate-200 p-4 font-normal outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100`}/><span className="mt-1 block text-right text-xs font-normal text-slate-400">{comment.length}/1200</span></label>
      <label className="mt-5 flex items-start gap-3 rounded-2xl bg-slate-50 p-4 text-sm leading-6 text-slate-700"><input type="checkbox" checked={confirmed} onChange={(event) => { setConfirmed(event.target.checked); setError(''); }} className="mt-0.5 h-5 w-5 shrink-0 accent-amber-500"/>I confirm this feedback is based on my event experience.</label>
      {error ? <p ref={errorRef} role="alert" className="mt-4 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}
      <button type="button" onClick={() => void submit()} disabled={busy} className="mt-6 hidden w-full rounded-2xl bg-amber-400 px-5 py-4 font-black text-slate-950 shadow-lg shadow-amber-100 disabled:opacity-50 sm:block">{busy ? 'Submitting feedback…' : 'Submit feedback'}</button>
    </div>
  </div><div className="fixed inset-x-0 bottom-0 z-20 border-t border-slate-200 bg-white/95 p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] backdrop-blur sm:hidden"><button type="button" onClick={() => void submit()} disabled={busy} className="w-full rounded-2xl bg-amber-400 px-5 py-4 font-black text-slate-950 shadow-lg disabled:opacity-50">{busy ? 'Submitting feedback…' : `Submit feedback · ${answered}/${total}`}</button></div></main>;
}

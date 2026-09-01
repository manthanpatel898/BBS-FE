'use client';

import { useEffect, useState } from 'react';
import { createBookingFeedbackFollowUp, generateBookingFeedbackLink, getBookingFeedbackState, resolveBookingFeedbackFollowUp, submitStaffBookingFeedback, updateBookingFeedbackNote } from '@/lib/booking-feedback/api';
import { buildBookingFeedbackAnswers, validateFollowUpInput, validateStaffFeedbackCapture } from '@/lib/booking-feedback/domain';
import type { BookingFeedbackCaptureMethod, BookingFeedbackQuestionSnapshot, BookingFeedbackState } from '@/lib/booking-feedback/types';

type Props = { accessToken: string; orderId: string; customerName: string; eventType?: string | null; eventDate?: string | null; onClose: () => void };
type Notice = { tone: 'success' | 'error' | 'info'; text: string } | null;
const noticeClass = { success: 'border-emerald-200 bg-emerald-50 text-emerald-800', error: 'border-red-200 bg-red-50 text-red-700', info: 'border-amber-200 bg-amber-50 text-amber-800' };

function formatEventDate(value?: string | null) {
  if (!value) return null;
  return new Intl.DateTimeFormat('en-IN', { day: '2-digit', month: 'short', year: 'numeric' }).format(new Date(value));
}

function StaffEntryForm({ questions, busy, pendingLink, onCancel, onSubmit }: { questions: BookingFeedbackQuestionSnapshot[]; busy: boolean; pendingLink: boolean; onCancel: () => void; onSubmit: (input: { answers: Array<{ questionId: string; rating: number }>; comment: string; captureMethod: BookingFeedbackCaptureMethod; captureMethodOther: string; staffContext: string; consentConfirmed: true }) => Promise<void> }) {
  const [ratings, setRatings] = useState<Record<string, number>>({});
  const [comment, setComment] = useState('');
  const [captureMethod, setCaptureMethod] = useState<BookingFeedbackCaptureMethod | ''>('');
  const [captureMethodOther, setCaptureMethodOther] = useState('');
  const [staffContext, setStaffContext] = useState('');
  const [consentConfirmed, setConsentConfirmed] = useState(false);
  const [error, setError] = useState('');
  const answered = Object.keys(ratings).length;
  async function submit() {
    try {
      const answers = buildBookingFeedbackAnswers(questions, ratings);
      validateStaffFeedbackCapture({ captureMethod, captureMethodOther, consentConfirmed });
      setError('');
      await onSubmit({ answers, comment, captureMethod: captureMethod as BookingFeedbackCaptureMethod, captureMethodOther, staffContext, consentConfirmed: true });
    } catch (reason) { setError(reason instanceof Error ? reason.message : 'Unable to save feedback.'); }
  }
  return <section className="mt-6"><div className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4"><p className="font-bold text-indigo-950">Record feedback with the customer</p><p className="mt-1 text-sm leading-6 text-indigo-800">This response will be marked as entered by staff and your name will be recorded for audit purposes.</p>{pendingLink ? <p className="mt-2 text-sm font-bold text-red-700">Submitting here will make the previously generated customer link unusable.</p> : null}</div><div className="mt-4 flex items-center justify-between"><h3 className="font-black text-slate-950">Feedback questions</h3><span className="rounded-full bg-slate-100 px-3 py-1 text-xs font-bold text-slate-700">{answered}/{questions.length} answered</span></div><div className="mt-3 space-y-3">{questions.map((question, index) => <div key={question.id} className="rounded-2xl border border-slate-200 p-4"><p className="text-sm font-bold leading-6 text-slate-900"><span className="mr-2 text-amber-600">{index + 1}.</span>{question.text}</p><div role="radiogroup" aria-label={`Rating for ${question.text}`} className="mt-3 grid grid-cols-5 gap-2">{[1,2,3,4,5].map((rating) => <button type="button" role="radio" aria-checked={ratings[question.id] === rating} aria-label={`${rating} stars`} key={rating} onClick={() => setRatings((values) => ({ ...values, [question.id]: rating }))} className={`min-h-12 rounded-xl border font-black ${rating <= (ratings[question.id] || 0) ? 'border-amber-300 bg-amber-100 text-amber-600' : 'border-slate-200 bg-slate-50 text-slate-400'}`}>★<span className="block text-[10px] text-slate-600">{rating}</span></button>)}</div></div>)}</div><div className="mt-4 grid gap-4 rounded-2xl border border-slate-200 p-4 sm:grid-cols-2"><label className="text-sm font-bold text-slate-800">How was feedback captured?<select value={captureMethod} onChange={(event) => setCaptureMethod(event.target.value as BookingFeedbackCaptureMethod | '')} className="mt-2 w-full rounded-xl border border-slate-200 bg-white p-3 font-normal"><option value="">Select method</option><option value="IN_PERSON">In person</option><option value="PHONE">Phone</option><option value="WHATSAPP">WhatsApp</option><option value="EMAIL">Email</option><option value="OTHER">Other</option></select></label>{captureMethod === 'OTHER' ? <label className="text-sm font-bold text-slate-800">Describe the method<input value={captureMethodOther} maxLength={100} onChange={(event) => setCaptureMethodOther(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label> : null}</div><label className="mt-4 block text-sm font-bold text-slate-800">Customer comment <span className="font-normal text-slate-500">(optional)</span><textarea value={comment} maxLength={2000} onChange={(event) => setComment(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"/></label><label className="mt-4 block text-sm font-bold text-slate-800">Staff context <span className="font-normal text-slate-500">(optional · internal only)</span><textarea value={staffContext} maxLength={2000} onChange={(event) => setStaffContext(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label><label className="mt-4 flex items-start gap-3 rounded-xl bg-slate-50 p-4 text-sm font-semibold text-slate-800"><input type="checkbox" checked={consentConfirmed} onChange={(event) => setConsentConfirmed(event.target.checked)} className="mt-1 h-4 w-4"/><span>I confirm that the customer supplied or approved this feedback.</span></label>{error ? <p role="alert" className="mt-3 rounded-xl border border-red-200 bg-red-50 p-3 text-sm font-semibold text-red-700">{error}</p> : null}<div className="mt-5 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={onCancel} className="rounded-xl border border-slate-300 px-5 py-3 font-bold text-slate-700">Cancel</button><button type="button" disabled={busy || !questions.length} onClick={() => void submit()} className="rounded-xl bg-indigo-600 px-5 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Saving feedback…' : 'Save feedback'}</button></div></section>;
}

export function BookingFeedbackModal({ accessToken, orderId, customerName, eventType, eventDate, onClose }: Props) {
  const [state, setState] = useState<BookingFeedbackState | null>(null);
  const [link, setLink] = useState('');
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [notice, setNotice] = useState<Notice>(null);
  const [confirmReplacement, setConfirmReplacement] = useState(false);
  const [copied, setCopied] = useState(false);
  const [staffEntry, setStaffEntry] = useState(false);
  const [followUpMode, setFollowUpMode] = useState<'create' | 'resolve' | null>(null);
  const [followUpNote, setFollowUpNote] = useState('');
  const [followUpDueDate, setFollowUpDueDate] = useState('');

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

  async function submitStaff(input: { answers: Array<{ questionId: string; rating: number }>; comment: string; captureMethod: BookingFeedbackCaptureMethod; captureMethodOther: string; staffContext: string; consentConfirmed: true }) {
    setBusy(true); setNotice(null);
    try { await submitStaffBookingFeedback(accessToken, orderId, { ...input, comment: input.comment.trim() || undefined, captureMethodOther: input.captureMethod === 'OTHER' ? input.captureMethodOther.trim() : undefined, staffContext: input.staffContext.trim() || undefined }); setState(await getBookingFeedbackState(accessToken, orderId)); setStaffEntry(false); setLink(''); setNotice({ tone: 'success', text: 'Feedback recorded successfully.' }); }
    catch (reason) { setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to save feedback.' }); throw reason; }
    finally { setBusy(false); }
  }

  async function saveFollowUp() {
    try {
      validateFollowUpInput(followUpNote);
      setBusy(true); setNotice(null);
      if (followUpMode === 'resolve') await resolveBookingFeedbackFollowUp(accessToken, orderId, followUpNote.trim());
      else await createBookingFeedbackFollowUp(accessToken, orderId, { note: followUpNote.trim(), dueDate: followUpDueDate || undefined });
      setState(await getBookingFeedbackState(accessToken, orderId)); setFollowUpMode(null); setFollowUpNote(''); setFollowUpDueDate('');
      setNotice({ tone: 'success', text: followUpMode === 'resolve' ? 'Follow-up resolved.' : 'Follow-up created.' });
    } catch (reason) { setNotice({ tone: 'error', text: reason instanceof Error ? reason.message : 'Unable to update follow-up.' }); }
    finally { setBusy(false); }
  }

  const status = !state ? 'Loading' : state.displayStatus === 'STAFF_RECORDED' ? 'Staff recorded' : state.displayStatus === 'RECEIVED' ? 'Received' : state.displayStatus === 'WAITING' ? 'Waiting' : 'Not requested';
  const formattedDate = formatEventDate(eventDate);

  return <div className="fixed inset-0 z-[100] flex items-end justify-center bg-slate-950/55 backdrop-blur-sm sm:items-center sm:p-6" role="dialog" aria-modal="true" aria-labelledby="booking-feedback-title">
    <div className="max-h-[92dvh] w-full overflow-y-auto rounded-t-3xl bg-white shadow-2xl sm:max-w-2xl sm:rounded-3xl">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-slate-100 bg-white/95 p-5 backdrop-blur sm:p-7"><div className="min-w-0"><p className="text-xs font-black uppercase tracking-[0.2em] text-amber-600">Booking feedback</p><h2 id="booking-feedback-title" className="mt-2 text-2xl font-black text-slate-950">Request feedback · {customerName}</h2><p className="mt-1 text-sm text-slate-500">{[eventType, formattedDate, `Booking ${orderId.slice(-6).toUpperCase()}`].filter(Boolean).join(' · ')}</p></div><button type="button" onClick={onClose} className="grid h-11 w-11 shrink-0 place-items-center rounded-full border border-slate-300 text-xl text-slate-600 hover:bg-slate-50" aria-label="Close">×</button></header>
      <div className="p-5 sm:p-7">
        <div className="flex items-center justify-between gap-3"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Feedback status</p><span className={`rounded-full px-3 py-1 text-xs font-black ${status === 'Received' ? 'bg-emerald-100 text-emerald-800' : status === 'Waiting' ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-700'}`}>{status}</span></div>
        {!state ? <div className="mt-6 animate-pulse space-y-3 rounded-2xl border border-slate-200 p-5"><div className="h-5 w-1/2 rounded bg-slate-200"/><div className="h-4 w-4/5 rounded bg-slate-100"/></div> : staffEntry ? <StaffEntryForm questions={state.questions ?? []} busy={busy} pendingLink={state.state === 'PENDING'} onCancel={() => setStaffEntry(false)} onSubmit={submitStaff}/> : state.state === 'SUBMITTED' && state.response ? <>
          <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-5"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-sm font-bold text-emerald-800">Feedback received</p><span className="rounded-full bg-white px-3 py-1 text-xs font-black text-emerald-800">{state.response.submissionSource === 'STAFF_ENTRY' ? `Staff entry${state.response.submittedByName ? ` · ${state.response.submittedByName}` : ''}` : 'Customer link'}</span></div><div className="mt-2 flex flex-wrap items-end justify-between gap-2"><p className="text-3xl font-black text-emerald-950">{state.response.averageRating.toFixed(1)} / 5</p><p className="text-xs font-semibold text-emerald-800">{state.response.answers.length} question{state.response.answers.length === 1 ? '' : 's'} answered · {new Date(state.response.submittedAt).toLocaleDateString('en-IN')}</p></div></div>
          <div className="mt-4 space-y-3">{state.response.answers.map((answer) => <div key={answer.questionId} className="rounded-xl border border-slate-200 p-4"><p className="text-sm font-semibold text-slate-800">{answer.questionText}</p><p className="mt-2 font-bold text-amber-600" aria-label={`${answer.rating} out of 5 stars`}>{'★'.repeat(answer.rating)}<span className="text-slate-200">{'★'.repeat(5 - answer.rating)}</span><span className="ml-2 text-sm text-slate-600">{answer.rating}/5</span></p></div>)}</div>
          {state.response.captureMethod ? <p className="mt-3 text-sm font-semibold text-slate-600">Captured via {state.response.captureMethod.replaceAll('_', ' ').toLowerCase()}{state.response.captureMethodOther ? ` · ${state.response.captureMethodOther}` : ''}</p> : null}
          {state.response.comment ? <section className="mt-4 rounded-xl bg-slate-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-slate-500">Customer comment</p><p className="mt-2 text-sm leading-6 text-slate-800">{state.response.comment}</p></section> : null}
          {state.response.staffContext ? <section className="mt-4 rounded-xl border border-violet-100 bg-violet-50 p-4"><p className="text-xs font-bold uppercase tracking-wider text-violet-700">Private staff context</p><p className="mt-2 text-sm leading-6 text-violet-950">{state.response.staffContext}</p></section> : null}
          {state.response.lowRatingFlag ? <section className="mt-4 rounded-2xl border border-red-200 bg-red-50 p-4"><div className="flex flex-wrap items-start justify-between gap-3"><div><p className="text-xs font-black uppercase tracking-wider text-red-700">Low-rating follow-up</p><p className="mt-1 text-sm font-semibold text-red-950">{state.response.followUp.status === 'OPEN' ? 'Open follow-up' : state.response.followUp.status === 'RESOLVED' ? 'Resolved follow-up' : 'No follow-up created'}</p>{state.response.followUp.creationNote ? <p className="mt-2 text-sm text-red-900">{state.response.followUp.creationNote}</p> : null}{state.response.followUp.dueDate ? <p className="mt-1 text-xs font-bold text-red-700">Due {new Date(state.response.followUp.dueDate).toLocaleDateString('en-IN')}</p> : null}{state.response.followUp.resolutionNote ? <p className="mt-2 rounded-lg bg-white/70 p-2 text-sm text-emerald-900">Resolution: {state.response.followUp.resolutionNote}</p> : null}</div><button type="button" onClick={() => { setFollowUpMode(state.response?.followUp.status === 'OPEN' ? 'resolve' : 'create'); setFollowUpNote(''); setNotice(null); }} className="rounded-xl bg-red-700 px-4 py-2.5 text-sm font-bold text-white">{state.response.followUp.status === 'OPEN' ? 'Resolve' : state.response.followUp.status === 'RESOLVED' ? 'Reopen' : 'Create follow-up'}</button></div>{followUpMode ? <div className="mt-4 rounded-xl bg-white p-4"><label className="block text-sm font-bold text-slate-800">{followUpMode === 'resolve' ? 'Resolution note' : 'Follow-up note'}<textarea value={followUpNote} maxLength={followUpMode === 'resolve' ? 2000 : 1000} onChange={(event) => setFollowUpNote(event.target.value)} className="mt-2 min-h-20 w-full rounded-xl border border-slate-200 p-3 font-normal"/></label>{followUpMode === 'create' ? <label className="mt-3 block text-sm font-bold text-slate-800">Due date <span className="font-normal text-slate-500">(optional)</span><input type="date" value={followUpDueDate} onChange={(event) => setFollowUpDueDate(event.target.value)} className="mt-2 w-full rounded-xl border border-slate-200 p-3 font-normal sm:w-auto"/></label> : null}<div className="mt-3 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={() => { setFollowUpMode(null); setFollowUpNote(''); }} className="rounded-xl border border-slate-300 px-4 py-2.5 font-bold text-slate-700">Cancel</button><button type="button" disabled={busy} onClick={() => void saveFollowUp()} className="rounded-xl bg-slate-950 px-4 py-2.5 font-bold text-white disabled:opacity-50">{busy ? 'Saving…' : followUpMode === 'resolve' ? 'Mark resolved' : 'Save follow-up'}</button></div></div> : null}</section> : null}
          <section className="mt-5 border-t border-slate-200 pt-5"><label className="block text-sm font-bold text-slate-800">Internal note <span className="font-normal text-slate-500">· visible only to your team</span><textarea value={note} onChange={(event) => setNote(event.target.value)} className="mt-2 min-h-24 w-full rounded-xl border border-slate-200 p-3 font-normal outline-none focus:border-amber-400 focus:ring-4 focus:ring-amber-100"/></label><button type="button" disabled={busy} onClick={() => void saveNote()} className="mt-3 w-full rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50 sm:w-auto">{busy ? 'Saving…' : 'Save internal note'}</button></section>
        </> : <>
          <div className="mt-6 rounded-2xl border border-slate-200 bg-slate-50/60 p-5"><p className="font-bold text-slate-950">{state.state === 'PENDING' ? 'Waiting for customer response' : 'No feedback link generated yet'}</p><p className="mt-2 text-sm leading-6 text-slate-600">{state.state === 'PENDING' ? 'The secure link has been generated. For security, it cannot be displayed again.' : 'Generate a secure, single-use link and share it with the customer.'}</p></div>
          {state.state === 'PENDING' && state.invitation?.expiresAt ? <p className="mt-2 text-xs font-semibold text-slate-500">Link expires {new Intl.DateTimeFormat('en-IN', { dateStyle: 'medium', timeStyle: 'short' }).format(new Date(state.invitation.expiresAt))}</p> : null}
          {link ? <section className="mt-4 rounded-2xl border border-amber-200 bg-amber-50 p-4"><p className="text-xs font-black uppercase tracking-wider text-amber-800">Copy this link before closing</p><p className="mt-1 text-xs text-amber-700">For security, the full link will not be shown again.</p><div className="mt-3 flex flex-col gap-2 sm:flex-row"><input aria-label="Generated feedback link" readOnly value={link} onFocus={(event) => event.currentTarget.select()} className="min-w-0 flex-1 rounded-xl border border-amber-200 bg-white px-3 py-3 text-sm text-slate-800"/><button type="button" onClick={() => void copyLink()} className="rounded-xl bg-amber-400 px-5 py-3 font-black text-slate-950">{copied ? 'Copied' : 'Copy link'}</button></div></section> : null}
          <div className="mt-4 grid gap-2 sm:flex">{state.state === 'PENDING' ? <button type="button" disabled={busy} onClick={() => setConfirmReplacement(true)} className="rounded-xl border border-red-200 bg-white px-5 py-3 text-sm font-bold text-red-700 disabled:opacity-50">Generate replacement link</button> : <button type="button" disabled={busy} onClick={() => void generate(false)} className="rounded-xl bg-slate-950 px-5 py-3 text-sm font-bold text-white disabled:opacity-50">{busy ? 'Generating…' : 'Generate customer link'}</button>}<button type="button" disabled={busy || !state.questions?.length} onClick={() => { setNotice(null); setStaffEntry(true); }} className="rounded-xl border border-indigo-200 bg-indigo-50 px-5 py-3 text-sm font-bold text-indigo-800 disabled:opacity-50">Fill feedback now</button></div>
        </>}
        {notice ? <p role={notice.tone === 'error' ? 'alert' : 'status'} className={`mt-4 rounded-xl border p-3 text-sm font-semibold ${noticeClass[notice.tone]}`}>{notice.text}</p> : null}
      </div>
    </div>
    {confirmReplacement ? <div className="fixed inset-0 z-[110] grid place-items-center bg-slate-950/60 p-5"><div className="w-full max-w-md rounded-3xl bg-white p-6 shadow-2xl" role="alertdialog" aria-modal="true" aria-labelledby="replace-feedback-link-title"><h3 id="replace-feedback-link-title" className="text-xl font-black text-slate-950">Replace the existing link?</h3><p className="mt-2 text-sm leading-6 text-slate-600">The previously shared link will stop working immediately. Generate a replacement only when the customer needs a new link.</p><div className="mt-6 flex flex-col-reverse gap-2 sm:flex-row sm:justify-end"><button type="button" disabled={busy} onClick={() => setConfirmReplacement(false)} className="rounded-xl border border-slate-300 px-4 py-3 font-bold text-slate-700">Keep current link</button><button type="button" disabled={busy} onClick={() => void generate(true)} className="rounded-xl bg-red-600 px-4 py-3 font-bold text-white disabled:opacity-50">{busy ? 'Generating…' : 'Generate replacement'}</button></div></div></div> : null}
  </div>;
}

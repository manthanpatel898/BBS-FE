'use client';
import { useEffect, useState } from 'react';
import { AppSettings } from '@/lib/auth/types';
import { updateBookingFeedbackSettings } from '@/lib/booking-feedback/api';
import { resolveBookingFeedbackQuestions } from '@/lib/booking-feedback/domain';
import { useToast } from '@/components/ui/toast';

type Props = { accessToken: string; settings: AppSettings; onSaved: (settings: AppSettings) => void };
export function BookingFeedbackSettings({ accessToken, settings, onSaved }: Props) {
  const [enabled, setEnabled] = useState(Boolean(settings.enableBookingFeedback));
  const [questions, setQuestions] = useState(() => resolveBookingFeedbackQuestions(settings.bookingFeedbackQuestions));
  const [saving, setSaving] = useState(false); const { showToast } = useToast();
  useEffect(() => { setEnabled(Boolean(settings.enableBookingFeedback)); setQuestions(resolveBookingFeedbackQuestions(settings.bookingFeedbackQuestions)); }, [settings]);
  const update = (index: number, patch: Partial<(typeof questions)[number]>) => setQuestions((items) => items.map((item, itemIndex) => itemIndex === index ? { ...item, ...patch } : item));
  const move = (index: number, offset: -1 | 1) => setQuestions((items) => { const target = index + offset; if (target < 0 || target >= items.length) return items; const next = [...items]; [next[index], next[target]] = [next[target], next[index]]; return next; });
  async function save() {
    const active = questions.filter((item) => item.active);
    if (enabled && !active.length) return showToast('Keep at least one active question.', 'error');
    if (questions.some((item) => !item.text.trim())) return showToast('Every question needs text.', 'error');
    try { setSaving(true); const next = await updateBookingFeedbackSettings(accessToken, { enableBookingFeedback: enabled, questions: questions.map((item, index) => ({ ...item, text: item.text.trim(), displayOrder: index })) }); onSaved(next); showToast('Booking feedback settings updated.', 'success'); }
    catch (reason) { showToast(reason instanceof Error ? reason.message : 'Unable to save feedback settings.', 'error'); }
    finally { setSaving(false); }
  }
  return <section className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm">
    <header className="flex flex-col gap-5 border-b border-slate-100 px-5 py-6 sm:flex-row sm:items-center sm:justify-between sm:px-7">
      <div><p className="text-xs font-bold uppercase tracking-[0.2em] text-amber-600">Customer experience</p><h2 className="mt-1 text-2xl font-black text-slate-950">Booking Feedback</h2><p className="mt-1 text-sm text-slate-600">Five ready-to-use questions are provided by default. Add, edit, reorder, or remove them anytime.</p></div>
      <button type="button" role="switch" aria-checked={enabled} onClick={() => setEnabled((value) => !value)} className={`flex min-h-12 shrink-0 items-center gap-3 rounded-full border px-4 py-2 font-bold transition ${enabled ? 'border-emerald-200 bg-emerald-50 text-emerald-800' : 'border-slate-200 bg-slate-100 text-slate-600'}`}><span className={`relative h-6 w-11 rounded-full transition ${enabled ? 'bg-emerald-500' : 'bg-slate-300'}`}><span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition ${enabled ? 'left-[22px]' : 'left-0.5'}`}/></span>{enabled ? 'Enabled' : 'Disabled'}</button>
    </header>
    <div className="space-y-3 bg-slate-50/60 p-4 sm:p-6">{questions.map((question, index) => <article key={question.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start gap-3"><span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-amber-50 text-sm font-black text-amber-700">{index + 1}</span><div className="min-w-0 flex-1"><label className="text-xs font-bold uppercase tracking-wider text-slate-500">Question<input value={question.text} onChange={(event) => update(index, { text: event.target.value })} className="mt-2 min-h-12 w-full rounded-xl border border-slate-200 bg-white px-4 text-base font-semibold text-slate-900 outline-none transition focus:border-amber-400 focus:ring-4 focus:ring-amber-100"/></label><div className="mt-3 flex flex-wrap items-center gap-2"><button type="button" disabled={index === 0} onClick={() => move(index, -1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-30" aria-label="Move question up">↑ Up</button><button type="button" disabled={index === questions.length - 1} onClick={() => move(index, 1)} className="rounded-lg border border-slate-200 px-3 py-2 text-sm font-bold text-slate-600 disabled:opacity-30" aria-label="Move question down">↓ Down</button><label className="flex min-h-10 items-center gap-2 rounded-lg bg-slate-100 px-3 text-sm font-semibold text-slate-700"><input type="checkbox" checked={question.active} onChange={(event) => update(index, { active: event.target.checked })} className="h-4 w-4 accent-emerald-600"/>Active</label><button type="button" onClick={() => setQuestions((items) => items.filter((_, itemIndex) => itemIndex !== index))} className="ml-auto rounded-lg border border-red-200 bg-red-50 px-3 py-2 text-sm font-bold text-red-700">Delete</button></div></div></div></article>)}</div>
    <footer className="flex flex-col-reverse gap-3 border-t border-slate-100 px-5 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-7"><button type="button" disabled={questions.length >= 10} onClick={() => setQuestions((items) => [...items, { id: crypto.randomUUID(), text: '', active: true, displayOrder: items.length }])} className="min-h-12 rounded-xl border border-slate-300 bg-white px-5 font-bold text-slate-700 disabled:cursor-not-allowed disabled:opacity-40">+ Add question <span className="font-normal text-slate-500">({questions.length}/10)</span></button><button type="button" disabled={saving} onClick={() => void save()} className="min-h-12 rounded-xl bg-amber-400 px-6 font-black text-slate-950 shadow-lg shadow-amber-200 transition hover:bg-amber-300 disabled:opacity-50">{saving ? 'Saving…' : 'Save feedback settings'}</button></footer>
  </section>;
}

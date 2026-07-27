'use client';

import { useCallback, useEffect, useMemo, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationEventDetailModal } from '@/components/decoration/decoration-event-detail-modal';
import { DecorationFollowupModal } from '@/components/decoration/decoration-followup-modal';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { PageLoader } from '@/components/ui/page-loader';
import { fetchDecorationBookings } from '@/lib/auth/api';
import type { DecorationBooking } from '@/lib/auth/types';
import {
  buildDecorationRequiredFollowupQueue,
  decorationDateKey,
  type DecorationFollowupScheduleEntry,
  type DecorationFollowupState,
} from '@/lib/decoration/followups';

const stateMeta: Record<DecorationFollowupState, { label: string; badge: string; dot: string }> = {
  TAKEN_TODAY: { label: 'FOLLOW UP TAKEN TODAY', badge: 'border-emerald-300 bg-emerald-50 text-emerald-700', dot: 'bg-emerald-500' },
  PENDING: { label: 'FOLLOW UP PENDING', badge: 'border-amber-300 bg-amber-50 text-amber-700', dot: 'bg-amber-400' },
  OVERDUE: { label: 'FOLLOW UP OVERDUE', badge: 'border-red-300 bg-red-50 text-red-700', dot: 'bg-red-500' },
  DUE_TODAY: { label: 'FOLLOW UP DUE TODAY', badge: 'border-orange-300 bg-orange-50 text-orange-700', dot: 'bg-orange-500' },
  SCHEDULED: { label: 'FOLLOW UP SCHEDULED', badge: 'border-blue-300 bg-blue-50 text-blue-700', dot: 'bg-blue-500' },
};

function displayDate(value: string, options?: Intl.DateTimeFormatOptions) {
  return new Intl.DateTimeFormat('en-US', options ?? { month: 'short', day: 'numeric', year: 'numeric' })
    .format(new Date(`${value}T12:00:00`));
}

function timeLabel(value: string) {
  if (!value) return '—';
  const [hour, minute] = value.split(':').map(Number);
  return new Intl.DateTimeFormat('en-US', { hour: '2-digit', minute: '2-digit' })
    .format(new Date(2000, 0, 1, hour, minute));
}

function replaceBooking(current: DecorationBooking[], updated: DecorationBooking) {
  return current.map((booking) => booking.id === updated.id ? updated : booking);
}

export function DecorationFollowupWorkspace() {
  useAppPageHeader({ eyebrow: 'Followups', title: 'Followups' });
  const { accessToken } = useAuth();
  const [bookings, setBookings] = useState<DecorationBooking[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [detailId, setDetailId] = useState<string | null>(null);
  const [followupBooking, setFollowupBooking] = useState<DecorationBooking | null>(null);

  const load = useCallback(async () => {
    if (!accessToken) return;
    setLoading(true);
    setError('');
    try {
      setBookings(await fetchDecorationBookings(accessToken));
    } catch (reason) {
      setError(reason instanceof Error ? reason.message : 'Unable to load follow-ups.');
    } finally {
      setLoading(false);
    }
  }, [accessToken]);

  useEffect(() => { void load(); }, [load]);

  const queue = useMemo(() => buildDecorationRequiredFollowupQueue(bookings), [bookings]);

  function updated(booking: DecorationBooking) {
    setBookings((current) => replaceBooking(current, booking));
    setFollowupBooking(null);
  }

  return (
    <div className="w-full px-3 pb-10 sm:px-6 lg:px-8">
      <section className="mb-6"><h2 className="text-2xl font-bold text-slate-900">Required Follow Ups</h2><p className="mt-2 text-sm text-slate-500">Open inquiries requiring action now. Scheduled follow-ups appear automatically on their due date.</p></section>
      {error ? <div role="alert" className="mb-5 flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700"><span>{error}</span><button onClick={() => void load()} className="rounded-lg border border-red-300 px-3 py-1.5">Retry</button></div> : null}
      {loading ? <PageLoader message="Loading follow-ups…" /> : null}
      {!loading && !error && queue.length === 0 ? <EmptyState /> : null}
      {!loading && queue.length ? <DecorationRequiredFollowupList entries={queue} onDetail={setDetailId} onFollowup={setFollowupBooking} /> : null}
      {detailId ? <DecorationEventDetailModal bookingId={detailId} initialBooking={bookings.find((booking) => booking.id === detailId)} onClose={() => setDetailId(null)} onUpdated={updated} onDeleted={(deletedId)=>setBookings(current=>current.filter(item=>item.id!==deletedId))} /> : null}
      {followupBooking ? <DecorationFollowupModal booking={followupBooking} onClose={() => setFollowupBooking(null)} onSaved={updated} /> : null}
    </div>
  );
}

export function DecorationRequiredFollowupList({ entries, onDetail, onFollowup }: { entries: DecorationFollowupScheduleEntry[]; onDetail: (id: string) => void; onFollowup: (booking: DecorationBooking) => void }) {
  const [dayEntries,setDayEntries]=useState<DecorationFollowupScheduleEntry[]|null>(null);
  const grouped=useMemo(()=>{const months=new Map<string,Map<string,DecorationFollowupScheduleEntry[]>>();for(const entry of entries){const monthKey=entry.dateKey.slice(0,7),days=months.get(monthKey)??new Map<string,DecorationFollowupScheduleEntry[]>();days.set(entry.dateKey,[...(days.get(entry.dateKey)??[]),entry]);months.set(monthKey,days)}return [...months.entries()].sort(([a],[b])=>a.localeCompare(b))},[entries]);
  return <><div className="w-full space-y-7">{grouped.map(([monthKey,days])=><section key={monthKey} className="space-y-3"><h3 className="inline-flex border-b-2 border-amber-300 pb-1 text-lg font-bold text-slate-900">{new Intl.DateTimeFormat('en-US',{month:'long',year:'numeric'}).format(new Date(`${monthKey}-01T12:00:00`))}</h3><div className="flex flex-wrap gap-3">{[...days.entries()].sort(([a],[b])=>a.localeCompare(b)).map(([dateKey,dateEntries])=>{const date=new Date(`${dateKey}T12:00:00`);return <button key={dateKey} type="button" aria-label={`${displayDate(dateKey)} ${dateEntries.length} inquiry${dateEntries.length===1?'':'s'}`} onClick={()=>setDayEntries(dateEntries)} className="min-h-24 w-[calc(50%-6px)] rounded-[20px] border border-slate-200 bg-white p-2.5 text-left transition hover:border-slate-300 sm:w-[calc(33.333%-8px)] md:w-[calc(25%-9px)] lg:w-[calc(20%-10px)]"><div className="flex items-center justify-between"><span className="inline-flex h-6 w-6 items-center justify-center text-sm font-semibold text-slate-900">{date.getDate()}</span><span className="rounded-full bg-slate-100 px-2 py-0.5 text-[10px] font-medium text-slate-600">{dateEntries.length}</span></div><div className="mt-3 flex flex-wrap gap-1.5">{dateEntries.slice(0,6).map(entry=><span key={entry.booking.id} className={`h-2.5 w-2.5 rounded-full ${stateMeta[entry.state].dot}`}/>)}</div><p className="mt-3 text-[10px] text-slate-500">{dateEntries.length} inquiry{dateEntries.length===1?'':'s'}</p></button>})}</div></section>)}</div>{dayEntries?<DayFollowupPanel entries={dayEntries} onClose={()=>setDayEntries(null)} onDetail={(id)=>{setDayEntries(null);onDetail(id)}} onFollowup={onFollowup}/>:null}</>;
}

function DayFollowupPanel({entries,onClose,onDetail,onFollowup}:{entries:DecorationFollowupScheduleEntry[];onClose:()=>void;onDetail:(id:string)=>void;onFollowup:(booking:DecorationBooking)=>void}){
 const day=entries[0].dateKey;return <><button type="button" aria-label="Close follow-up day panel" onClick={onClose} className="fixed inset-0 z-40 cursor-default bg-slate-900/30 backdrop-blur-sm"/><aside role="dialog" aria-modal="true" aria-label={`Follow-ups for ${displayDate(day)}`} className="fixed inset-y-0 left-0 z-50 flex w-full max-w-xl flex-col border-r border-slate-200 bg-white shadow-2xl"><header className="flex items-start justify-between gap-4 border-b border-slate-200 px-4 py-4 sm:px-5"><div><p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">Day Inquiries</p><h3 className="mt-2 text-2xl font-bold text-slate-900">{displayDate(day)}</h3><p className="mt-1 text-sm text-slate-500">{entries.length} inquiry{entries.length===1?'':'s'}</p></div><button type="button" onClick={onClose} aria-label="Close day panel" className="inline-flex h-11 w-11 items-center justify-center rounded-full border border-slate-200 text-slate-500">×</button></header><div className="flex-1 overflow-y-auto px-4 py-4 sm:px-5"><div className="space-y-3">{entries.map(({booking,state,followup})=><article key={booking.id} className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"><div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="font-semibold text-slate-900">{booking.customer.name}</p><p className="mt-1 text-sm text-slate-600">{booking.eventType.name}</p><p className="mt-1 text-xs text-slate-500">{booking.customer.mobile}</p><p className="mt-1 text-xs text-slate-500">Event: {displayDate(decorationDateKey(booking.startDate))}</p><p className="mt-1 text-xs text-slate-500">{timeLabel(booking.startTime)} – {timeLabel(booking.endTime)}</p>{followup?.note?<p className="mt-2 text-xs text-slate-600">{followup.note}</p>:null}</div><div className="flex shrink-0 flex-col items-end gap-2"><span className={`rounded-full border px-3 py-1 text-[10px] font-bold ${stateMeta[state].badge}`}>{stateMeta[state].label}</span><a href={`tel:${booking.customer.mobile}`} aria-label={`Call ${booking.customer.name}`} className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-500 hover:border-emerald-200 hover:bg-emerald-50 hover:text-emerald-600"><svg viewBox="0 0 20 20" fill="currentColor" className="h-4 w-4"><path fillRule="evenodd" d="M2 3.5A1.5 1.5 0 013.5 2h1.148a1.5 1.5 0 011.465 1.175l.716 3.223a1.5 1.5 0 01-1.052 1.767l-.933.267c-.41.117-.643.555-.48.95a11.542 11.542 0 006.254 6.254c.395.163.833-.07.95-.48l.267-.933a1.5 1.5 0 011.767-1.052l3.223.716A1.5 1.5 0 0118 16.352V17.5A1.5 1.5 0 0116.5 19H15A13 13 0 012 5V3.5z" clipRule="evenodd"/></svg></a></div></div><div className="mt-4 flex gap-2"><button type="button" onClick={()=>onDetail(booking.id)} aria-label="View booking" className="inline-flex h-10 w-10 items-center justify-center rounded-xl border border-slate-200 text-slate-600"><svg viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="1.7" className="h-4 w-4"><path d="M1.5 10s3-5 8.5-5 8.5 5 8.5 5-3 5-8.5 5-8.5-5-8.5-5Z"/><circle cx="10" cy="10" r="2.5"/></svg></button><button type="button" onClick={()=>onFollowup(booking)} className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700">Follow ups</button></div></article>)}</div></div></aside></>
}

function EmptyState() { return <div className="rounded-3xl border border-dashed border-slate-300 bg-white px-5 py-16 text-center"><div className="mx-auto grid h-14 w-14 place-items-center rounded-full bg-emerald-100 text-2xl text-emerald-700">✓</div><h2 className="mt-4 text-2xl font-bold text-slate-950">All caught up</h2><p className="mt-2 text-slate-600">No active decoration inquiries require a follow-up.</p></div>; }

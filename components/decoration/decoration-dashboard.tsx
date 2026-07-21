'use client';

import Link from 'next/link';
import { useCallback, useEffect, useRef, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationDashboardCharts } from '@/components/decoration/decoration-dashboard-charts';
import { DecorationDashboardRecordsPanel } from '@/components/decoration/decoration-dashboard-records-panel';
import { DecorationEventDetailModal } from '@/components/decoration/decoration-event-detail-modal';
import { DecorationPageEmpty, DecorationPageError, DecorationPageLoading } from '@/components/decoration/decoration-page-state';
import { fetchDecorationDashboard, fetchDecorationDashboardRecords } from '@/lib/auth/api';
import type { DecorationBooking, DecorationDashboardData, DecorationDashboardRecords } from '@/lib/auth/types';
import { buildDecorationDashboardCards, buildDecorationMobileCalendarCard } from '@/lib/decoration/dashboard-view';
import { decorationDashboardUrl, parseDecorationDashboardQuery } from '@/lib/decoration/dashboard-query';

const cardTone = { amber:'border-amber-200 bg-amber-50 text-amber-950',blue:'border-blue-200 bg-blue-50 text-blue-950',emerald:'border-emerald-200 bg-emerald-50 text-emerald-950',red:'border-red-200 bg-red-50 text-red-950',slate:'border-slate-200 bg-slate-50 text-slate-950',violet:'border-violet-200 bg-violet-50 text-violet-950' } as const;

export function DecorationDashboard(){
  const {accessToken}=useAuth(),router=useRouter(),searchParams=useSearchParams();
  const query=parseDecorationDashboardQuery(searchParams);
  const [data,setData]=useState<DecorationDashboardData|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(true);
  const [records,setRecords]=useState<DecorationDashboardRecords|null>(null),[recordsError,setRecordsError]=useState(''),[recordsLoading,setRecordsLoading]=useState(false);
  const latestRecordsRequest=useRef(0);
  const load=useCallback(async()=>{if(!accessToken)return;setError('');setLoading(true);try{setData(await fetchDecorationDashboard(accessToken))}catch(reason){setError(reason instanceof Error?reason.message:'Unable to load dashboard')}finally{setLoading(false)}},[accessToken]);
  useEffect(()=>{void load()},[load]);
  const loadRecords=useCallback(async()=>{if(!accessToken||!query.view)return;const requestId=++latestRecordsRequest.current;setRecordsLoading(true);setRecordsError('');try{const value=await fetchDecorationDashboardRecords(accessToken,query.view,query.page);if(requestId===latestRecordsRequest.current)setRecords(value)}catch(reason){if(requestId===latestRecordsRequest.current)setRecordsError(reason instanceof Error?reason.message:'Unable to load bookings')}finally{if(requestId===latestRecordsRequest.current)setRecordsLoading(false)}},[accessToken,query.page,query.view]);
  useEffect(()=>{if(query.view)void loadRecords();else{latestRecordsRequest.current+=1;setRecords(null);setRecordsError('')}},[loadRecords,query.view]);
  if(loading&&!data)return <DecorationPageLoading message="Loading operations dashboard…" cardCount={8}/>;
  if(error&&!data)return <DecorationPageError message={error} onRetry={()=>void load()}/>;
  if(!data)return <DecorationPageEmpty title="Dashboard is unavailable" description="Refresh to load your decoration operations."/>;
  const cards=buildDecorationDashboardCards(data);
  const calendarCard=buildDecorationMobileCalendarCard(data);
  if(query.view)return <div className="min-w-0 max-w-full text-slate-900">
    <DecorationDashboardRecordsPanel type={query.view} records={records} loading={recordsLoading} error={recordsError} onRetry={()=>void loadRecords()} onBack={()=>router.replace(decorationDashboardUrl({}),{scroll:false})} onPageChange={(page)=>router.replace(decorationDashboardUrl({view:query.view,page}),{scroll:false})} onOpenBooking={(booking)=>router.replace(decorationDashboardUrl({view:query.view,page:query.page,bookingId:booking.id}),{scroll:false})}/>
    {query.bookingId?<DecorationEventDetailModal bookingId={query.bookingId} initialBooking={records?.items.find(item=>item.id===query.bookingId)} onClose={()=>router.replace(decorationDashboardUrl({view:query.view,page:query.page}),{scroll:false})} onUpdated={(updated)=>setRecords(current=>current?{...current,items:current.items.map(item=>item.id===updated.id?updated:item)}:current)}/>:null}
  </div>;
  return <div className="min-w-0 max-w-full space-y-6 overflow-hidden text-slate-900">
    {error?<DecorationPageError message={error} onRetry={()=>void load()}/>:null}
    <Link href={calendarCard.href} className="block min-w-0 rounded-2xl border border-slate-200 bg-slate-950 p-4 text-white shadow-sm sm:hidden"><div className="flex items-start justify-between gap-3"><p className="text-sm font-semibold">{calendarCard.label}</p><span aria-hidden="true">→</span></div><p className="mt-3 text-2xl font-black">{calendarCard.value}</p><p className="mt-1 text-xs text-slate-300">{calendarCard.description}</p></Link>
    <div className="grid min-w-0 max-w-full gap-3 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-5">{cards.map(card=><button type="button" key={card.id} onClick={()=>router.replace(decorationDashboardUrl({view:card.recordType,page:1}),{scroll:false})} className={`group min-h-11 min-w-0 max-w-full rounded-2xl border p-4 text-left shadow-sm transition hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-amber-500 focus:ring-offset-2 ${cardTone[card.tone]}`}><div className="flex min-w-0 items-start justify-between gap-3"><p className="min-w-0 break-words text-sm font-semibold">{card.label}</p><span aria-hidden="true" className="shrink-0 text-lg">→</span></div><p className="mt-3 break-words text-2xl font-black tracking-tight">{card.value}</p><p className="mt-1 break-words text-xs leading-5 opacity-75">{card.description}</p></button>)}</div>
    <DecorationDashboardCharts data={data}/>
  </div>;
}

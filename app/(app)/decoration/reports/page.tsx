'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import type { DecorationLimitedReportKind } from '@/lib/auth/types';

const REPORTS:Array<{type:DecorationLimitedReportKind;title:string;description:string;badge:string;group:'Bookings'|'Financial'}>=[
  {type:'worksheet',title:'Event Worksheet',description:'Your familiar event register inside the application. Review event details and edit inquiry rows without maintaining a separate Excel sheet.',badge:'Inline inquiry editor',group:'Bookings'},
  {type:'booking',title:'Booking Report',description:'Generate a complete event booking register for any selected date range, including customer, venue, status and payment position.',badge:'Date range report',group:'Bookings'},
  {type:'advance',title:'Advance Collections',description:'View every advance payment collected during the selected period, with payment mode, remark and employee details.',badge:'Payment-date ledger',group:'Financial'},
  {type:'pending',title:'Pending Amounts',description:'See outstanding balances for committed events so collections can be followed up before the event date.',badge:'Outstanding dues',group:'Financial'},
];

export default function DecorationReportsPage(){
  const{user}=useAuth();
  const allowed=user?.role==='company_admin'||hasPermission(user,PERMISSIONS.DECORATION_REPORTS_VIEW);
  if(!allowed)return <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm"><p className="text-sm font-medium text-slate-600">You do not have permission to view decoration reports.</p></div>;
  return <div className="space-y-8 text-slate-950">
    <section className="rounded-2xl border border-slate-200 bg-white p-6 text-slate-950 shadow-sm"><p className="text-xs font-semibold uppercase tracking-[.25em] text-amber-700">Event Decoration · Reports</p><h1 className="mt-2 text-2xl font-bold text-slate-950 sm:text-3xl">All Reports</h1><p className="mt-2 max-w-2xl text-sm text-slate-700">Four focused reports for daily event operations, booking reviews and payment collection. Apply filters, preview records, then export as CSV or XLSX.</p></section>
    {(['Bookings','Financial'] as const).map(group=><section key={group} className="space-y-4 text-slate-950"><div><p className={`text-xs font-semibold uppercase tracking-[.2em] ${group==='Financial'?'text-emerald-700':'text-amber-700'}`}>{group==='Financial'?'Money & Collections':'Inquiry & Confirmations'}</p><h2 className="mt-1 text-xl font-bold text-slate-950">{group}</h2></div><div className="grid gap-4 md:grid-cols-2">{REPORTS.filter(item=>item.group===group).map(item=><Link key={item.type} href={`/decoration/reports/view/?type=${item.type}`} className={`group rounded-2xl border border-slate-200 bg-white p-5 text-slate-950 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md ${group==='Financial'?'hover:border-emerald-200':'hover:border-amber-200'}`}><div className="flex items-start justify-between gap-4"><div><h3 className="text-lg font-bold text-slate-950">{item.title}</h3><p className="mt-2 text-sm leading-6 text-slate-700">{item.description}</p></div><span className="text-xl text-slate-700 transition group-hover:translate-x-1">→</span></div><span className={`mt-4 inline-flex rounded-full px-3 py-1 text-xs font-semibold ${group==='Financial'?'bg-emerald-50 text-emerald-800':'bg-amber-50 text-amber-800'}`}>{item.badge}</span></Link>)}</div></section>)}
  </div>;
}

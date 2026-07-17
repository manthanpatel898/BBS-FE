'use client';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompanyProfileSection } from './company-profile-section';
import { EventTypesSection } from './event-types-section';
import { LocationsSection } from './locations-section';
import { DecorationCatalogSection } from './decoration-catalog-section';
import { normalizeDecorationSettingsTab, type DecorationSettingsTab } from '@/lib/decoration/settings-view';

const tabs: Array<{id:DecorationSettingsTab;label:string}>=[{id:'profile',label:'Company Profile'},{id:'events',label:'Event Types'},{id:'venues',label:'Hotels, Venues & Halls'},{id:'decoration',label:'Decoration'}];

export function DecorationSettings(){const router=useRouter(),params=useSearchParams(),active=normalizeDecorationSettingsTab(params.get('tab'));function select(tab:DecorationSettingsTab){router.replace(tab==='profile'?'/decoration/settings':`/decoration/settings?tab=${tab}`,{scroll:false})}return <div className="space-y-6"><p className="max-w-2xl text-sm text-slate-500">Configure company branding and the options used by decoration inquiries and events.</p><div className="overflow-x-auto"><div className="flex min-w-max rounded-2xl border border-slate-200 bg-slate-50 p-1">{tabs.map(tab=><button key={tab.id} onClick={()=>select(tab.id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${active===tab.id?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-800'}`}>{tab.label}</button>)}</div></div>{active==='profile'?<CompanyProfileSection/>:active==='events'?<EventTypesSection/>:active==='venues'?<LocationsSection/>:<DecorationCatalogSection/>}</div>}

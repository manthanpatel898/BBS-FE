'use client';
import { useAuth } from '@/components/auth/auth-provider';
import { canAccessEventExpenses } from '@/lib/auth/event-expenses-addon';
import { hasPermission, PERMISSIONS } from '@/lib/auth/permissions';
import { ExpenseTypesSettings } from '../expenses/expense-types-settings';
import { useRouter, useSearchParams } from 'next/navigation';
import { CompanyProfileSection } from './company-profile-section';
import { EventTypesSection } from './event-types-section';
import { LocationsSection } from './locations-section';
import { DecorationCatalogSection } from './decoration-catalog-section';
import { HotDatesManager, type HotDatesApi } from '@/components/settings/hot-dates-manager';
import { bulkUploadDecorationHotDates, createDecorationHotDate, deleteDecorationHotDate, fetchDecorationHotDates, updateDecorationHotDate } from '@/lib/auth/api';
import { normalizeDecorationSettingsTab, type DecorationSettingsTab } from '@/lib/decoration/settings-view';

const tabs: Array<{id:DecorationSettingsTab;label:string}>=[{id:'profile',label:'Company Profile'},{id:'events',label:'Event Types'},{id:'venues',label:'Banquets, Outdoor Venues & Halls'},{id:'decoration',label:'Decoration'},{id:'hotDates',label:'Hot Dates'},{id:'expenses',label:'Expense Types'}];
const decorationHotDatesApi:HotDatesApi={fetch:fetchDecorationHotDates,create:createDecorationHotDate,update:updateDecorationHotDate,remove:deleteDecorationHotDate,bulkUpload:bulkUploadDecorationHotDates};

export function DecorationSettings(){const{user}=useAuth();const expenseSettingsAllowed=canAccessEventExpenses(user)&&(user?.role==='company_admin'||hasPermission(user,PERMISSIONS.DECORATION_EXPENSE_TYPES_MANAGE));const router=useRouter(),params=useSearchParams(),requested=normalizeDecorationSettingsTab(params.get('tab')),active=requested==='expenses'&&!expenseSettingsAllowed?'profile':requested;function select(tab:DecorationSettingsTab){router.replace(tab==='profile'?'/decoration/settings':`/decoration/settings?tab=${tab}`,{scroll:false})}return <div className="space-y-6"><p className="max-w-2xl text-sm text-slate-500">Configure company branding and the options used by decoration inquiries and events.</p><div className="overflow-x-auto"><div className="flex min-w-max rounded-2xl border border-slate-200 bg-slate-50 p-1">{tabs.filter(tab=>tab.id!=='expenses'||expenseSettingsAllowed).map(tab=><button key={tab.id} onClick={()=>select(tab.id)} className={`rounded-xl px-4 py-2.5 text-sm font-semibold transition sm:px-5 ${active===tab.id?'bg-white text-slate-900 shadow-sm':'text-slate-500 hover:text-slate-800'}`}>{tab.label}</button>)}</div></div>{active==='profile'?<CompanyProfileSection/>:active==='events'?<EventTypesSection/>:active==='venues'?<LocationsSection/>:active==='decoration'?<DecorationCatalogSection/>:active==='expenses'?<ExpenseTypesSettings/>:<HotDatesManager api={decorationHotDatesApi} description="Manage high-demand dates for decoration events."/>}</div>}

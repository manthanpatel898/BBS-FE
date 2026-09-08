'use client';

import { useEffect, useState, type ReactNode } from 'react';
import { readDashboardView, saveDashboardView, type DashboardView } from './dashboard-preference';

export function DashboardViewSwitch({ userId, restaurantId, children }: {
  userId: string; restaurantId: string; children: (view: DashboardView) => ReactNode;
}) {
  const [view, setView] = useState<DashboardView>('current');
  useEffect(() => {
    try { setView(readDashboardView(window.localStorage, userId, restaurantId)); } catch { setView('current'); }
  }, [userId, restaurantId]);
  return <>
    <div className="flex flex-wrap items-center justify-between gap-3">
      <p className="text-sm text-slate-600">Choose your dashboard view</p>
      <div role="group" aria-label="Dashboard view" className="inline-flex gap-1 rounded-2xl border border-slate-200 bg-white p-1 shadow-sm">
        {(['current', 'new'] as const).map((value) => <button key={value} type="button" aria-pressed={view === value}
          className={`min-h-11 rounded-xl px-4 text-sm font-bold focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-amber-500 ${view === value ? 'bg-amber-400 text-slate-950' : 'text-slate-600 hover:bg-slate-50'}`}
          onClick={() => { setView(value); try { saveDashboardView(window.localStorage, userId, restaurantId, value); } catch { /* Storage may be unavailable in private browsing. */ } }}>
          {value === 'new' ? 'New dashboard' : 'Current'}
        </button>)}
      </div>
    </div>
    {children(view)}
  </>;
}

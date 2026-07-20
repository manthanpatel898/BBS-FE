'use client';

import { Suspense } from 'react';
import { DecorationDashboard } from '@/components/decoration/decoration-dashboard';
import { useAppPageHeader } from '@/components/layouts/app-layout';

export default function DecorationDashboardPage() {
  useAppPageHeader({ eyebrow: 'Event Decoration', title: 'Operations Dashboard' });
  return <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">Loading dashboard…</div>}><DecorationDashboard /></Suspense>;
}

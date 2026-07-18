'use client';

import { Suspense } from 'react';
import { DecorationWorkspace } from '@/components/decoration/decoration-workspace';
import { useAppPageHeader } from '@/components/layouts/app-layout';

export default function DecorationEventsPage() {
  useAppPageHeader({ eyebrow: 'Event Decoration', title: 'Events & Inquiries' });
  return <Suspense fallback={<div className="rounded-2xl border border-slate-200 bg-white p-8 text-slate-600">Loading events…</div>}><DecorationWorkspace /></Suspense>;
}

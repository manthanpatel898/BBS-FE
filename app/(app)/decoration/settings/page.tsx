'use client';
import { Suspense } from 'react';
import { DecorationSettings } from '@/components/decoration/settings/decoration-settings';
import { useAppPageHeader } from '@/components/layouts/app-layout';

export default function DecorationSettingsPage(){useAppPageHeader({eyebrow:'Event Decoration',title:'Settings'});return <Suspense fallback={<div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Loading settings…</div>}><DecorationSettings/></Suspense>}

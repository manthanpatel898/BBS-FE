'use client';
import { useEffect } from 'react';
import { useRouter } from 'next/navigation';
export default function DecorationConfigurationCompatibilityPage(){const router=useRouter();useEffect(()=>router.replace('/decoration/settings'),[router]);return <div className="rounded-3xl border border-slate-200 bg-white p-10 text-center text-sm text-slate-500">Opening decoration settings…</div>}

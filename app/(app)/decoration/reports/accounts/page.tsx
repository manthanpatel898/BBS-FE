'use client';
import { Suspense } from 'react';
import { DecorationEventAccount } from '@/components/decoration/expenses/event-account';
export default function EventAccountPage() { return <Suspense fallback={<p>Loading event account…</p>}><DecorationEventAccount /></Suspense>; }

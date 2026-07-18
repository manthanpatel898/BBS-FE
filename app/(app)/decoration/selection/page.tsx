'use client';

import { useEffect, useState } from 'react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationSelectionModal } from '@/components/decoration/decoration-selection-modal';
import { fetchDecorationBooking } from '@/lib/auth/api';
import type { DecorationBooking } from '@/lib/auth/types';
import { decorationEventsUrl } from '@/lib/decoration/overlay-query';

export default function DecorationSelectionRecoveryPage() {
  const { accessToken } = useAuth(); const params = useSearchParams(), router = useRouter(), bookingId = params.get('bookingId');
  const [booking, setBooking] = useState<DecorationBooking | null>(null), [error, setError] = useState('');
  useEffect(() => { if (!accessToken || !bookingId) return; let active = true; fetchDecorationBooking(accessToken, bookingId).then((value) => { if (active) setBooking(value); }).catch((reason) => { if (active) setError(reason instanceof Error ? reason.message : 'Unable to load event.'); }); return () => { active = false; }; }, [accessToken, bookingId]);
  if (!bookingId) return <State message="A bookingId query parameter is required." />;
  if (error) return <State message={error} />;
  if (!booking) return <State message="Loading decoration selection…" />;
  return <DecorationSelectionModal booking={booking} onClose={() => router.replace(decorationEventsUrl({ date: booking.startDate.slice(0, 10), bookingId: booking.id }))} onSaved={(updated) => { setBooking(updated); router.replace(decorationEventsUrl({ date: updated.startDate.slice(0, 10), bookingId: updated.id })); }} />;
}
function State({ message }: { message: string }) { return <main className="mx-auto max-w-xl p-10 text-center"><h1 className="text-xl font-bold">Decoration Selection</h1><p className="mt-2 text-slate-500">{message}</p></main>; }

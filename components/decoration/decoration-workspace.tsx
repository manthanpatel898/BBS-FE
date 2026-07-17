'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationCalendar } from '@/components/decoration/decoration-calendar';
import { DecorationDaySidebar } from '@/components/decoration/decoration-day-sidebar';
import { DecorationEventDetailModal } from '@/components/decoration/decoration-event-detail-modal';
import { DecorationInquiryForm } from '@/components/decoration/decoration-inquiry-form';
import { DecorationPageError, DecorationPageLoading } from '@/components/decoration/decoration-page-state';
import { fetchDecorationCalendar } from '@/lib/auth/api';
import type { DecorationBooking } from '@/lib/auth/types';
import { getDecorationDayBookings, isLatestDecorationCalendarRequest, replaceDecorationBooking } from '@/lib/decoration/calendar';
import { decorationOverlayReducer, initialDecorationOverlayState } from '@/lib/decoration/overlay-state';

export function DecorationWorkspace() {
  const { accessToken } = useAuth();
  const [month, setMonth] = useState(() => { const now = new Date(); return new Date(now.getFullYear(), now.getMonth(), 1); });
  const [bookings, setBookings] = useState<DecorationBooking[]>([]);
  const [overlay, dispatch] = useReducer(decorationOverlayReducer, initialDecorationOverlayState);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const latestRequestId = useRef(0);

  const loadMonth = useCallback(async (background = false) => {
    if (!accessToken) return;
    const requestId = ++latestRequestId.current;
    if (!background) setLoading(true);
    setError('');
    try {
      const response = await fetchDecorationCalendar(accessToken, month.getFullYear(), month.getMonth() + 1);
      if (isLatestDecorationCalendarRequest(requestId, latestRequestId.current)) setBookings(response.bookings);
    } catch (requestError) {
      if (isLatestDecorationCalendarRequest(requestId, latestRequestId.current)) setError(requestError instanceof Error ? requestError.message : 'Unable to load events calendar');
    } finally {
      if (isLatestDecorationCalendarRequest(requestId, latestRequestId.current)) setLoading(false);
    }
  }, [accessToken, month]);

  useEffect(() => { void loadMonth(); }, [loadMonth]);

  const selectedBookings = overlay.date ? getDecorationDayBookings(bookings, overlay.date) : [];
  const openAdd = (date?: string) => {
    if (date && date !== overlay.date) dispatch({ type: 'OPEN_DAY', date, origin: 'EVENTS' });
    setIsInquiryOpen(true);
  };

  if (loading && !bookings.length) return <DecorationPageLoading message="Loading events calendar…" />;
  if (error && !bookings.length) return <DecorationPageError message={error} onRetry={() => void loadMonth()} />;

  return (
    <div className="space-y-5 text-slate-900">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div><p className="text-sm text-slate-600">View inquiries and confirmed decoration events by date.</p></div>
        <button type="button" onClick={() => openAdd()} className="rounded-xl bg-amber-500 px-5 py-3 font-bold text-white shadow-sm hover:bg-amber-600">Add inquiry</button>
      </div>
      {error ? <DecorationPageError message={error} onRetry={() => void loadMonth(true)} /> : null}
      <DecorationCalendar month={month} bookings={bookings} selectedDate={overlay.date} onMonthChange={setMonth} onOpenDay={(date) => dispatch({ type: 'OPEN_DAY', date, origin: 'EVENTS' })} />
      {overlay.date ? (
        <DecorationDaySidebar
          date={overlay.date}
          bookings={selectedBookings}
          onClose={() => dispatch({ type: 'CLOSE_TOP' })}
          onAdd={() => openAdd(overlay.date ?? undefined)}
          onOpenBooking={(id) => dispatch({ type: 'OPEN_DETAIL', bookingId: id })}
        />
      ) : null}
      {overlay.bookingId ? <DecorationEventDetailModal bookingId={overlay.bookingId} initialBooking={bookings.find((booking) => booking.id === overlay.bookingId)} onClose={() => dispatch({ type: 'CLOSE_TOP' })} onUpdated={(updated) => setBookings((current) => replaceDecorationBooking(current, updated))} /> : null}
      {isInquiryOpen ? <DecorationInquiryForm date={overlay.date ?? undefined} onClose={() => setIsInquiryOpen(false)} onSaved={(booking) => { setBookings(current => replaceDecorationBooking(current, booking)); setIsInquiryOpen(false); void loadMonth(true); }} /> : null}
    </div>
  );
}

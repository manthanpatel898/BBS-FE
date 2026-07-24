'use client';

import { useCallback, useEffect, useReducer, useRef, useState } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/auth/auth-provider';
import { DecorationCalendar } from '@/components/decoration/decoration-calendar';
import { DecorationDaySidebar } from '@/components/decoration/decoration-day-sidebar';
import { DecorationEventDetailModal } from '@/components/decoration/decoration-event-detail-modal';
import { DecorationInquiryForm } from '@/components/decoration/decoration-inquiry-form';
import { DecorationPageError, DecorationPageLoading } from '@/components/decoration/decoration-page-state';
import { fetchDecorationCalendar, fetchDecorationHotDates } from '@/lib/auth/api';
import type { DecorationBooking, HotDate } from '@/lib/auth/types';
import { getDecorationDayBookings, getOrLoadDecorationHotDateYear, isLatestDecorationCalendarRequest, isLatestDecorationHotDateRequest, replaceDecorationBooking } from '@/lib/decoration/calendar';
import { decorationOverlayReducer, initialDecorationOverlayState } from '@/lib/decoration/overlay-state';
import { canonicalDecorationOverlayUrl, decorationEventsUrl, isDecorationOverlayUrlCurrent, readDecorationOverlayQuery } from '@/lib/decoration/overlay-query';
import { canCreateDecorationInquiry, decorationBusinessDate } from '@/lib/decoration/booking-date-policy';

function monthForDate(date: string | null): Date {
  const value = date ? new Date(`${date}T00:00:00`) : new Date();
  return new Date(value.getFullYear(), value.getMonth(), 1);
}

export function DecorationWorkspace() {
  const { accessToken } = useAuth();
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const initialQuery = readDecorationOverlayQuery(searchParams);
  const [month, setMonth] = useState(() => monthForDate(initialQuery.date));
  const [bookings, setBookings] = useState<DecorationBooking[]>([]);
  const [overlay, dispatch] = useReducer(decorationOverlayReducer, {
    ...initialDecorationOverlayState,
    date: initialQuery.date,
    bookingId: initialQuery.bookingId,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isInquiryOpen, setIsInquiryOpen] = useState(false);
  const [hotDates, setHotDates] = useState<HotDate[]>([]);
  const latestRequestId = useRef(0);
  const latestHotDateRequestId = useRef(0);
  const hotDatesByYear = useRef(new Map<number, HotDate[]>());
  const pendingHotDateYears = useRef(new Map<number, Promise<HotDate[]>>());
  const hotDateToken = useRef<string | null>(null);
  const todayKey = decorationBusinessDate();

  const queryDate = searchParams.get('date');
  const queryBookingId = searchParams.get('bookingId');
  const queryString = searchParams.toString();
  useEffect(() => {
    const restored = readDecorationOverlayQuery(searchParams);
    const canonicalUrl = canonicalDecorationOverlayUrl(searchParams);
    if (!isDecorationOverlayUrlCurrent(pathname, searchParams, canonicalUrl)) router.replace(canonicalUrl, { scroll: false });
    dispatch({ type: 'RESTORE_QUERY', ...restored });
    if (restored.date) {
      const restoredMonth = monthForDate(restored.date);
      setMonth((current) => current.getTime() === restoredMonth.getTime() ? current : restoredMonth);
    }
  }, [pathname, queryBookingId, queryDate, queryString, router, searchParams]);

  const transition = useCallback((action: Parameters<typeof decorationOverlayReducer>[1]) => {
    const next = decorationOverlayReducer(overlay, action);
    dispatch(action);
    const nextUrl = decorationEventsUrl(next);
    if (!isDecorationOverlayUrlCurrent(pathname, searchParams, nextUrl)) router.replace(nextUrl, { scroll: false });
  }, [overlay, pathname, router, searchParams]);

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

  const hotDateYear = month.getFullYear();
  useEffect(() => {
    if (!accessToken) {
      setHotDates([]);
      return;
    }
    if (hotDateToken.current !== accessToken) {
      hotDateToken.current = accessToken;
      hotDatesByYear.current.clear();
      pendingHotDateYears.current.clear();
    }
    const requestId = ++latestHotDateRequestId.current;
    void getOrLoadDecorationHotDateYear(
      hotDatesByYear.current,
      pendingHotDateYears.current,
      hotDateYear,
      () => fetchDecorationHotDates(accessToken, hotDateYear),
    )
      .then((records) => {
        if (
          isLatestDecorationHotDateRequest(
            requestId,
            latestHotDateRequestId.current,
          )
        ) {
          setHotDates(records);
        }
      })
      .catch(() => {
        if (
          isLatestDecorationHotDateRequest(
            requestId,
            latestHotDateRequestId.current,
          )
        ) {
          setHotDates([]);
        }
      });
  }, [accessToken, hotDateYear]);

  const selectedBookings = overlay.date ? getDecorationDayBookings(bookings, overlay.date) : [];
  const openAdd = (date?: string) => {
    const targetDate = date ?? todayKey;
    if (!canCreateDecorationInquiry(targetDate, todayKey)) return;
    if (targetDate !== overlay.date) transition({ type: 'OPEN_DAY', date: targetDate, origin: 'EVENTS' });
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
      <DecorationCalendar month={month} bookings={bookings} hotDates={hotDates} selectedDate={overlay.date} onMonthChange={setMonth} onOpenDay={(date) => transition({ type: 'OPEN_DAY', date, origin: 'EVENTS' })} />
      {overlay.date ? (
        <DecorationDaySidebar
          date={overlay.date}
          bookings={selectedBookings}
          canAdd={canCreateDecorationInquiry(overlay.date, todayKey)}
          onClose={() => transition({ type: 'CLOSE_TOP' })}
          onAdd={() => openAdd(overlay.date ?? undefined)}
          onOpenBooking={(id) => transition({ type: 'OPEN_DETAIL', bookingId: id })}
        />
      ) : null}
      {overlay.bookingId ? <DecorationEventDetailModal key={overlay.bookingId} bookingId={overlay.bookingId} initialBooking={bookings.find((booking) => booking.id === overlay.bookingId)} onClose={() => transition({ type: 'CLOSE_TOP' })} onUpdated={(updated) => setBookings((current) => replaceDecorationBooking(current, updated))} /> : null}
      {isInquiryOpen ? <DecorationInquiryForm date={overlay.date ?? undefined} onClose={() => setIsInquiryOpen(false)} onSaved={(booking) => { setBookings(current => replaceDecorationBooking(current, booking)); setIsInquiryOpen(false); void loadMonth(true); }} /> : null}
    </div>
  );
}

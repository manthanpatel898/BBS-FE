export type DateRangeBooking = { startDate: string; endDate: string };

function dateKey(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid booking date');
  return date.toISOString().slice(0, 10);
}

export function groupDecorationBookingsByDate<T extends DateRangeBooking>(bookings: T[]) {
  const grouped = new Map<string, T[]>();
  for (const booking of bookings) {
    const key = dateKey(booking.startDate);
    grouped.set(key, [...(grouped.get(key) ?? []), booking]);
  }
  return grouped;
}

type DayBooking = DateRangeBooking & {
  startTime: string;
  customer: { name: string };
};

export function getDecorationDayBookings<T extends DayBooking>(bookings: T[], day: string): T[] {
  return [...(groupDecorationBookingsByDate(bookings).get(day) ?? [])].sort((left, right) =>
    left.startTime.localeCompare(right.startTime) || left.customer.name.localeCompare(right.customer.name),
  );
}

export function countDecorationStatuses<T extends { status: string }>(bookings: T[]) {
  return bookings.reduce<Record<string, number>>((counts, booking) => {
    counts[booking.status] = (counts[booking.status] ?? 0) + 1;
    return counts;
  }, {});
}

export function replaceDecorationBooking<T extends { id: string }>(bookings: T[], updated: T): T[] {
  const index = bookings.findIndex((booking) => booking.id === updated.id);
  if (index < 0) return [...bookings, updated];
  return bookings.map((booking, bookingIndex) => bookingIndex === index ? updated : booking);
}

export function isLatestDecorationCalendarRequest(requestId: number, latestRequestId: number) {
  return requestId === latestRequestId;
}

export type DecorationHotDateLike = {
  date: string;
  description: string;
};

export function indexDecorationHotDates<T extends DecorationHotDateLike>(
  hotDates: T[],
) {
  return new Map(hotDates.map((hotDate) => [hotDate.date, hotDate]));
}

export async function getOrLoadDecorationHotDateYear<T>(
  cache: Map<number, T[]>,
  pending: Map<number, Promise<T[]>>,
  year: number,
  loader: () => Promise<T[]>,
): Promise<T[]> {
  const cached = cache.get(year);
  if (cached) return cached;
  const active = pending.get(year);
  if (active) return active;
  const request = loader()
    .then((records) => {
      cache.set(year, records);
      pending.delete(year);
      return records;
    })
    .catch((error) => {
      pending.delete(year);
      throw error;
    });
  pending.set(year, request);
  return request;
}

export function isLatestDecorationHotDateRequest(
  requestId: number,
  latestRequestId: number,
) {
  return requestId === latestRequestId;
}

export function getDecorationCalendarCellState(
  date: string,
  today: string,
  selectedDate: string | null,
): { isToday: boolean; isSelected: boolean };
export function getDecorationCalendarCellState<T extends DecorationHotDateLike>(
  date: string,
  today: string,
  selectedDate: string | null,
  bookingCount: number,
  hotDates: Map<string, T>,
): {
  isToday: boolean;
  isSelected: boolean;
  hasBookings: boolean;
  isHotDate: boolean;
  hotDateDescription: string | null;
};
export function getDecorationCalendarCellState<T extends DecorationHotDateLike>(
  date: string,
  today: string,
  selectedDate: string | null,
  bookingCount?: number,
  hotDates?: Map<string, T>,
) {
  const base = { isToday: date === today, isSelected: date === selectedDate };
  if (bookingCount === undefined || !hotDates) return base;
  const hotDate = hotDates.get(date);
  return {
    ...base,
    hasBookings: bookingCount > 0,
    isHotDate: Boolean(hotDate),
    hotDateDescription: hotDate?.description ?? null,
  };
}

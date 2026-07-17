export type DateRangeBooking = { startDate: string; endDate: string };

function dateKey(value: string) {
  const date = new Date(value.length === 10 ? `${value}T00:00:00.000Z` : value);
  if (Number.isNaN(date.getTime())) throw new Error('Invalid booking date');
  return date.toISOString().slice(0, 10);
}

export function groupDecorationBookingsByDate<T extends DateRangeBooking>(bookings: T[]) {
  const grouped = new Map<string, T[]>();
  for (const booking of bookings) {
    const start = new Date(`${dateKey(booking.startDate)}T00:00:00.000Z`);
    const end = new Date(`${dateKey(booking.endDate)}T00:00:00.000Z`);
    if (end < start) continue;
    for (const cursor = new Date(start); cursor <= end; cursor.setUTCDate(cursor.getUTCDate() + 1)) {
      const key = cursor.toISOString().slice(0, 10);
      grouped.set(key, [...(grouped.get(key) ?? []), booking]);
    }
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

export function getDecorationCalendarCellState(date: string, today: string, selectedDate: string | null) {
  return { isToday: date === today, isSelected: date === selectedDate };
}

import type {
  DecorationBooking,
  DecorationFollowup,
} from '@/lib/auth/types';

const EXCLUDED_STATUSES = new Set(['CLOSED_INQUIRY', 'CANCELLED', 'COMPLETED']);

export type DecorationFollowupState = 'TAKEN' | 'PENDING' | 'OVERDUE';

export interface DecorationFollowupScheduleEntry {
  booking: DecorationBooking;
  followup: DecorationFollowup | null;
  dateKey: string;
  state: DecorationFollowupState;
}

export interface DecorationFollowupMonth {
  key: string;
  entries: DecorationFollowupScheduleEntry[];
}

export function decorationDateKey(value: string | Date): string {
  if (typeof value === 'string') {
    const match = value.match(/^\d{4}-\d{2}-\d{2}/);
    if (match) return match[0];
  }
  const date = new Date(value);
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function decorationFollowupState(
  followup: DecorationFollowup | null,
  todayKey = decorationDateKey(new Date()),
): DecorationFollowupState {
  if (!followup) return 'PENDING';
  if (decorationDateKey(followup.date) === todayKey) return 'TAKEN';
  const dueKey = decorationDateKey(followup.nextDate ?? followup.date);
  return dueKey < todayKey ? 'OVERDUE' : 'PENDING';
}

function latestPendingFollowup(booking: DecorationBooking) {
  return [...booking.followups]
    .filter((followup) => followup.status !== 'COMPLETED')
    .sort((left, right) => {
      const dateDifference = decorationDateKey(right.date).localeCompare(
        decorationDateKey(left.date),
      );
      if (dateDifference) return dateDifference;
      return String(right.id ?? right._id ?? '').localeCompare(
        String(left.id ?? left._id ?? ''),
      );
    })[0] ?? null;
}

export function buildDecorationFollowupSchedule(
  bookings: DecorationBooking[],
  todayKey = decorationDateKey(new Date()),
): DecorationFollowupScheduleEntry[] {
  return bookings
    .filter((booking) => !EXCLUDED_STATUSES.has(booking.status))
    .map((booking) => {
      const followup = latestPendingFollowup(booking);
      const dateKey = decorationDateKey(
        followup?.nextDate ?? followup?.date ?? booking.startDate ?? booking.createdAt!,
      );
      return {
        booking,
        followup,
        dateKey,
        state: decorationFollowupState(followup, todayKey),
      };
    })
    .sort((left, right) =>
      left.dateKey.localeCompare(right.dateKey) ||
      left.booking.customer.name.localeCompare(right.booking.customer.name),
    );
}

export function groupDecorationFollowupsByMonth(
  entries: DecorationFollowupScheduleEntry[],
): DecorationFollowupMonth[] {
  const grouped = new Map<string, DecorationFollowupScheduleEntry[]>();
  for (const entry of entries) {
    const key = entry.dateKey.slice(0, 7);
    grouped.set(key, [...(grouped.get(key) ?? []), entry]);
  }
  return [...grouped.entries()]
    .sort(([left], [right]) => left.localeCompare(right))
    .map(([key, monthEntries]) => ({ key, entries: monthEntries }));
}

import type {
  DecorationBooking,
  DecorationFollowup,
} from '@/lib/auth/types';

export type DecorationFollowupState = 'TAKEN_TODAY' | 'PENDING' | 'OVERDUE' | 'DUE_TODAY' | 'SCHEDULED';

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
  if (decorationDateKey(followup.date) === todayKey) return 'TAKEN_TODAY';
  if (!followup.nextDate) return 'PENDING';
  const dueKey = decorationDateKey(followup.nextDate);
  if (dueKey < todayKey) return 'OVERDUE';
  if (dueKey === todayKey) return 'DUE_TODAY';
  return 'SCHEDULED';
}

function latestFollowup(booking: DecorationBooking) {
  return [...booking.followups]
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
    .filter((booking) => booking.status === 'INQUIRY' && decorationDateKey(booking.startDate) >= todayKey)
    .map<DecorationFollowupScheduleEntry | null>((booking) => {
      const followup = latestFollowup(booking);
      if (followup?.status === 'COMPLETED') return null;
      const dateKey = followup?.nextDate
        ? decorationDateKey(followup.nextDate)
        : followup
          ? decorationDateKey(booking.startDate)
          : todayKey;
      return {
        booking,
        followup,
        dateKey,
        state: decorationFollowupState(followup, todayKey),
      };
    })
    .filter((entry): entry is DecorationFollowupScheduleEntry => entry !== null)
    .sort((left, right) =>
      left.dateKey.localeCompare(right.dateKey) ||
      left.booking.customer.name.localeCompare(right.booking.customer.name),
    );
}

const REQUIRED_STATE_PRIORITY: Partial<Record<DecorationFollowupState, number>> = {
  OVERDUE: 0,
  DUE_TODAY: 1,
  PENDING: 2,
};

export function buildDecorationRequiredFollowupQueue(
  bookings: DecorationBooking[],
  todayKey = decorationDateKey(new Date()),
): DecorationFollowupScheduleEntry[] {
  return buildDecorationFollowupSchedule(bookings, todayKey)
    .filter((entry) => REQUIRED_STATE_PRIORITY[entry.state] !== undefined)
    .sort((left, right) =>
      REQUIRED_STATE_PRIORITY[left.state]! - REQUIRED_STATE_PRIORITY[right.state]! ||
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

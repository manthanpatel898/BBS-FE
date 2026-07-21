import type {
  DecorationBooking,
  DecorationBookingStatus,
} from '@/lib/auth/types';

export type DecorationPaymentState = 'PAID' | 'PARTIAL' | 'UNPAID';
export type DecorationFollowupStatus = 'PENDING' | 'COMPLETED';

export type DecorationFollowupView = {
  id: string;
  date: string;
  nextDate: string | null;
  note: string;
  recordedBy: string;
  status: DecorationFollowupStatus;
  completedAt: string | null;
  completedBy: string | null;
};

export type DecorationStatusMeta = {
  label: string;
  dotClass: string;
  badgeClass: string;
  cardClass: string;
};

const inquiryCard = 'border-amber-300 bg-amber-50/60 shadow-[0_0_0_1px_rgba(245,158,11,0.15),0_4px_16px_rgba(245,158,11,0.12)]';
const bookedCard = 'border-emerald-300 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.15),0_4px_16px_rgba(16,185,129,0.12)]';
const closedCard = 'border-slate-400 bg-slate-100 shadow-[0_0_0_1px_rgba(15,23,42,0.16),0_4px_16px_rgba(15,23,42,0.12)]';
const cancelledCard = 'border-red-300 bg-red-50/60 shadow-[0_0_0_1px_rgba(239,68,68,0.15),0_4px_16px_rgba(239,68,68,0.12)]';

const STATUS_META: Record<DecorationBookingStatus, DecorationStatusMeta> = {
  INQUIRY: {
    label: 'Inquiry',
    dotClass: 'bg-amber-500',
    badgeClass: 'border-amber-200 bg-amber-50 text-amber-800',
    cardClass: inquiryCard,
  },
  CONFIRMED: {
    label: 'Confirmed',
    dotClass: 'bg-emerald-500',
    badgeClass: 'border-emerald-200 bg-emerald-50 text-emerald-800',
    cardClass: bookedCard,
  },
  DECORATION_SELECTION_PENDING: {
    label: 'Selection pending',
    dotClass: 'bg-cyan-500',
    badgeClass: 'border-cyan-200 bg-cyan-50 text-cyan-800',
    cardClass: bookedCard,
  },
  DECORATION_SELECTED: {
    label: 'Decoration selected',
    dotClass: 'bg-blue-500',
    badgeClass: 'border-blue-200 bg-blue-50 text-blue-800',
    cardClass: bookedCard,
  },
  IN_PROGRESS: {
    label: 'In progress',
    dotClass: 'bg-violet-500',
    badgeClass: 'border-violet-200 bg-violet-50 text-violet-800',
    cardClass: bookedCard,
  },
  COMPLETED: {
    label: 'Completed',
    dotClass: 'bg-slate-500',
    badgeClass: 'border-slate-300 bg-slate-100 text-slate-800',
    cardClass: bookedCard,
  },
  CANCELLED: {
    label: 'Cancelled',
    dotClass: 'bg-red-500',
    badgeClass: 'border-red-200 bg-red-50 text-red-800',
    cardClass: cancelledCard,
  },
  CLOSED_INQUIRY: {
    label: 'Closed inquiry',
    dotClass: 'bg-slate-700',
    badgeClass: 'border-slate-300 bg-slate-900 text-white',
    cardClass: closedCard,
  },
};

type RawDecorationFollowup = {
  _id?: string;
  id?: string;
  date: string;
  nextDate?: string | null;
  note: string;
  recordedBy: string;
  status?: DecorationFollowupStatus;
  completedAt?: string | null;
  completedBy?: string | null;
};

function toDateKey(value: string): string {
  const directMatch = value.match(/^\d{4}-\d{2}-\d{2}/)?.[0];
  if (directMatch) return directMatch;

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    throw new Error('Invalid decoration booking date');
  }
  return date.toLocaleDateString('en-CA', { timeZone: 'Asia/Kolkata' });
}

export function getDecorationStatusMeta(
  status: DecorationBookingStatus,
): DecorationStatusMeta {
  return STATUS_META[status];
}

export function getDecorationPaymentState(
  booking: Pick<DecorationBooking, 'outstandingAmount' | 'totalCollected'>,
): DecorationPaymentState {
  if (booking.outstandingAmount <= 0) return 'PAID';
  return booking.totalCollected > 0 ? 'PARTIAL' : 'UNPAID';
}

export function normalizeDecorationFollowups(
  followups: RawDecorationFollowup[],
): DecorationFollowupView[] {
  return followups.map((followup) => ({
    id: followup.id ?? followup._id ?? '',
    date: followup.date,
    nextDate: followup.nextDate ?? null,
    note: followup.note,
    recordedBy: followup.recordedBy,
    status: followup.status ?? 'PENDING',
    completedAt: followup.completedAt ?? null,
    completedBy: followup.completedBy ?? null,
  }));
}

export function getLatestDecorationFollowup(booking: {
  followups: Array<RawDecorationFollowup | DecorationFollowupView>;
}): DecorationFollowupView | null {
  return normalizeDecorationFollowups(booking.followups)
    .filter(
      (followup) => followup.status === 'PENDING' && followup.nextDate !== null,
    )
    .sort((left, right) =>
      (left.nextDate ?? '').localeCompare(right.nextDate ?? ''),
    )[0] ?? null;
}

export function bookingIntersectsDate(
  booking: Pick<DecorationBooking, 'startDate' | 'endDate'>,
  date: string,
): boolean {
  const selectedDate = toDateKey(date);
  return toDateKey(booking.startDate) === selectedDate;
}

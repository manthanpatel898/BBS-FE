export type DecorationDashboardSummary = {
  todayEvents: number;
  upcoming: number;
  followupsDue: number;
  openInquiries?: number;
  selectionPending: number;
  byStatus: Record<string, number>;
  packageValue: number;
  collected: number;
  outstanding: number;
  futureBookings: number;
};

export type DecorationDashboardCard = {
  id: string;
  label: string;
  value: string;
  description: string;
  recordType: import('@/lib/auth/types').DecorationDashboardRecordType;
  tone: 'amber' | 'blue' | 'emerald' | 'red' | 'slate' | 'violet';
};

const currencyFormatter = new Intl.NumberFormat('en-IN', {
  style: 'currency',
  currency: 'INR',
  maximumFractionDigits: 0,
});

export function formatIndianCurrency(value: number): string {
  return currencyFormatter.format(Number.isFinite(value) ? value : 0);
}

export function buildDecorationMobileCalendarCard(
  summary: Pick<DecorationDashboardSummary, 'futureBookings'>,
) {
  return {
    label: 'Calendar',
    value: String(summary.futureBookings ?? 0),
    description: 'Future booking entries',
    href: '/decoration/events/',
  };
}

export function buildDecorationDashboardCards(
  summary: DecorationDashboardSummary,
): DecorationDashboardCard[] {
  return [
    {
      id: 'today',
      label: "Today's events",
      value: String(summary.todayEvents ?? 0),
      description: 'Events scheduled for today',
      recordType: 'today',
      tone: 'amber',
    },
    {
      id: 'upcoming',
      label: 'Upcoming events',
      value: String(summary.upcoming ?? 0),
      description: 'Confirmed future events',
      recordType: 'upcoming',
      tone: 'blue',
    },
    {
      id: 'open-inquiries',
      label: 'Open inquiries',
      value: String(summary.openInquiries ?? summary.byStatus?.INQUIRY ?? 0),
      description: 'Awaiting confirmation',
      recordType: 'open_inquiries',
      tone: 'amber',
    },
    {
      id: 'followups',
      label: 'Follow-ups due',
      value: String(summary.followupsDue ?? 0),
      description: 'Due and overdue customer actions',
      recordType: 'followups',
      tone: 'violet',
    },
    {
      id: 'received',
      label: 'Advance received',
      value: formatIndianCurrency(summary.collected),
      description: 'Total collection across bookings',
      recordType: 'advance_received',
      tone: 'emerald',
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: formatIndianCurrency(summary.outstanding),
      description: 'Pending customer collection',
      recordType: 'outstanding',
      tone: 'red',
    },
    {
      id: 'selection-pending',
      label: 'Selection pending',
      value: String(summary.selectionPending ?? 0),
      description: 'Confirmed events needing decoration selection',
      recordType: 'selection_pending',
      tone: 'blue',
    },
  ];
}

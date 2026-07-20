export type DecorationDashboardSummary = {
  todayEvents: number;
  upcoming: number;
  followupsDue: number;
  selectionPending: number;
  byStatus: Record<string, number>;
  packageValue: number;
  collected: number;
  outstanding: number;
};

export type DecorationDashboardCard = {
  id: string;
  label: string;
  value: string;
  description: string;
  href: string;
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

export function buildDecorationDashboardCards(
  summary: DecorationDashboardSummary,
): DecorationDashboardCard[] {
  return [
    {
      id: 'today',
      label: "Today's events",
      value: String(summary.todayEvents ?? 0),
      description: 'Events scheduled for today',
      href: '/decoration/events?scope=today',
      tone: 'amber',
    },
    {
      id: 'upcoming',
      label: 'Upcoming events',
      value: String(summary.upcoming ?? 0),
      description: 'Confirmed future events',
      href: '/decoration/events?scope=upcoming',
      tone: 'blue',
    },
    {
      id: 'open-inquiries',
      label: 'Open inquiries',
      value: String(summary.byStatus?.INQUIRY ?? 0),
      description: 'Awaiting confirmation',
      href: '/decoration/events?status=INQUIRY',
      tone: 'amber',
    },
    {
      id: 'followups',
      label: 'Follow-ups due',
      value: String(summary.followupsDue ?? 0),
      description: 'Due and overdue customer actions',
      href: '/decoration/followups?state=due',
      tone: 'violet',
    },
    {
      id: 'received',
      label: 'Advance received',
      value: formatIndianCurrency(summary.collected),
      description: 'Total collection across bookings',
      href: '/decoration/reports?paymentState=PARTIAL',
      tone: 'emerald',
    },
    {
      id: 'outstanding',
      label: 'Outstanding',
      value: formatIndianCurrency(summary.outstanding),
      description: 'Pending customer collection',
      href: '/decoration/reports?paymentState=UNPAID',
      tone: 'red',
    },
    {
      id: 'selection-pending',
      label: 'Selection pending',
      value: String(summary.selectionPending ?? 0),
      description: 'Confirmed events needing decoration selection',
      href: '/decoration/events?status=DECORATION_SELECTION_PENDING',
      tone: 'blue',
    },
  ];
}

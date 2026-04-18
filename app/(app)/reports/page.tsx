'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';

type ReportType =
  | 'booking'
  | 'advance'
  | 'cancelled'
  | 'itemSales'
  | 'eventPlanner'
  | 'pendingPayments'
  | 'revenue'
  | 'upcomingEvents'
  | 'hallOccupancy'
  | 'repeatCustomers'
  | 'treasury';

type ReportCard = {
  type: ReportType;
  title: string;
  description: string;
  badge: string;
};

type ReportCategory = {
  label: string;
  eyebrow: string;
  color: 'amber' | 'emerald' | 'blue' | 'violet';
  reports: ReportCard[];
};

const REPORT_CATEGORIES: ReportCategory[] = [
  {
    label: 'Financial',
    eyebrow: 'Money & Collections',
    color: 'emerald',
    reports: [
      {
        type: 'revenue',
        title: 'Revenue Report',
        description:
          'Monthly, event-type, or hall-wise revenue breakdown for confirmed bookings. Spot your best-performing periods at a glance.',
        badge: 'By month / event / hall',
      },
      {
        type: 'pendingPayments',
        title: 'Pending Payments',
        description:
          'All confirmed bookings that still have an outstanding balance. Prioritise follow-ups before the event date.',
        badge: 'Outstanding dues',
      },
      {
        type: 'advance',
        title: 'Advance Collections',
        description:
          'Every advance payment recorded — filter by date, payment mode, or customer. Includes totals and remark.',
        badge: 'Collections log',
      },
      {
        type: 'treasury',
        title: 'Treasury Ledger',
        description:
          'Full chronological ledger of all advances — confirmed, cancelled, dine-in usages, payouts, next booking adjustments, and forfeited amounts. See where every rupee went.',
        badge: 'Confirmed · Cancelled · Forfeited',
      },
    ],
  },
  {
    label: 'Bookings',
    eyebrow: 'Inquiry & Confirmations',
    color: 'amber',
    reports: [
      {
        type: 'booking',
        title: 'Booking Report',
        description:
          'Inquiry, confirmed, or cancelled bookings with fully customisable columns and CSV / XLSX export.',
        badge: 'Inquiry · Confirmed · Cancelled',
      },
      {
        type: 'upcomingEvents',
        title: 'Upcoming Events',
        description:
          'All confirmed events in the next 7, 15, or 30 days — customer details, hall, slot, planner, and pending balance.',
        badge: '7 · 15 · 30 day window',
      },
      {
        type: 'cancelled',
        title: 'Cancellation Report',
        description:
          'Full history of cancelled bookings with cancellation reason, advance paid, totals, and inquiry details.',
        badge: 'Cancellation history',
      },
    ],
  },
  {
    label: 'Operations',
    eyebrow: 'Halls, Menu & Planning',
    color: 'blue',
    reports: [
      {
        type: 'hallOccupancy',
        title: 'Hall Occupancy',
        description:
          'Booking count, total guests, and revenue for each hall over any date range. Find your busiest and quietest halls.',
        badge: 'Hall-wise summary',
      },
      {
        type: 'itemSales',
        title: 'Item Sales',
        description:
          'See which menu sections — Soup, Farsan, Main Course, etc. — were selected the most in a given date range.',
        badge: 'Menu popularity',
      },
      {
        type: 'eventPlanner',
        title: 'Event Planner',
        description:
          'Which confirmed bookings are assigned to which planner, with assignment date, function details, and guest count.',
        badge: 'Planner assignment',
      },
    ],
  },
  {
    label: 'Customers',
    eyebrow: 'Loyalty & Retention',
    color: 'violet',
    reports: [
      {
        type: 'repeatCustomers',
        title: 'Repeat Customers',
        description:
          'Customers who have booked two or more times. Shows total bookings, lifetime revenue, and first vs last booking date.',
        badge: '2+ bookings',
      },
    ],
  },
];

const colorMap: Record<ReportCategory['color'], { eyebrow: string; badge: string; hover: string; dot: string }> = {
  emerald: {
    eyebrow: 'text-emerald-600',
    badge: 'bg-emerald-50 text-emerald-700',
    hover: 'hover:border-emerald-200',
    dot: 'bg-emerald-500',
  },
  amber: {
    eyebrow: 'text-amber-600',
    badge: 'bg-amber-50 text-amber-700',
    hover: 'hover:border-amber-200',
    dot: 'bg-amber-500',
  },
  blue: {
    eyebrow: 'text-blue-600',
    badge: 'bg-blue-50 text-blue-700',
    hover: 'hover:border-blue-200',
    dot: 'bg-blue-500',
  },
  violet: {
    eyebrow: 'text-violet-600',
    badge: 'bg-violet-50 text-violet-700',
    hover: 'hover:border-violet-200',
    dot: 'bg-violet-500',
  },
};

export default function ReportsPage() {
  const { user } = useAuth();

  if (user?.role !== 'company_admin') {
    return (
      <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center shadow-sm">
        <p className="text-sm font-medium text-slate-600">
          Reports are available for company admin only.
        </p>
      </div>
    );
  }

  const totalReports = REPORT_CATEGORIES.reduce((sum, cat) => sum + cat.reports.length, 0);

  return (
    <div className="space-y-8">
      {/* Header */}
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
              Reports
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              All Reports
            </h1>
            <p className="mt-2 max-w-2xl text-sm text-slate-500">
              {totalReports} reports across {REPORT_CATEGORIES.length} categories. Choose a report
              to apply filters, preview data, and export as CSV or XLSX.
            </p>
          </div>
          <div className="flex shrink-0 flex-wrap gap-2">
            {REPORT_CATEGORIES.map((cat) => {
              const c = colorMap[cat.color];
              return (
                <a
                  key={cat.label}
                  href={`#category-${cat.label.toLowerCase()}`}
                  className={`inline-flex items-center gap-2 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 transition hover:bg-slate-50`}
                >
                  <span className={`h-2 w-2 rounded-full ${c.dot}`} />
                  {cat.label}
                </a>
              );
            })}
          </div>
        </div>
      </section>

      {/* Categories */}
      {REPORT_CATEGORIES.map((category) => {
        const c = colorMap[category.color];
        return (
          <section
            key={category.label}
            id={`category-${category.label.toLowerCase()}`}
            className="space-y-4"
          >
            <div className="flex items-center gap-3">
              <span className={`h-3 w-3 rounded-full ${c.dot}`} />
              <div>
                <p className={`text-[10px] font-semibold uppercase tracking-[0.3em] ${c.eyebrow}`}>
                  {category.eyebrow}
                </p>
                <h2 className="text-lg font-bold text-slate-900">{category.label} Reports</h2>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-3">
              {category.reports.map((card) => (
                <Link
                  key={card.type}
                  href={`/reports/view?type=${card.type}`}
                  className={`group rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition ${c.hover} hover:shadow-md`}
                >
                  <span
                    className={`inline-block rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.2em] ${c.badge}`}
                  >
                    {card.badge}
                  </span>
                  <h3 className="mt-3 text-xl font-bold text-slate-900">{card.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
                  <div className="mt-5 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600 transition group-hover:bg-slate-200">
                    Open report →
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
    </div>
  );
}

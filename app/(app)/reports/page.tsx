'use client';

import Link from 'next/link';
import { useAuth } from '@/components/auth/auth-provider';

type ReportType = 'booking' | 'advance' | 'cancelled' | 'itemSales' | 'eventPlanner';

const REPORT_CARDS: Array<{
  type: ReportType;
  title: string;
  description: string;
  eyebrow: string;
}> = [
  {
    type: 'booking',
    title: 'Booking Report',
    description:
      'Generate inquiry, confirmed, or cancelled booking reports with customizable columns and exports.',
    eyebrow: 'Bookings',
  },
  {
    type: 'advance',
    title: 'Advance Payment Report',
    description:
      'Track advance collections by payment date, payment type, and customer with instant totals.',
    eyebrow: 'Collections',
  },
  {
    type: 'cancelled',
    title: 'Cancel Booking Report',
    description:
      'Export cancelled booking history with reason, advance paid, totals, and inquiry details.',
    eyebrow: 'Cancellations',
  },
  {
    type: 'itemSales',
    title: 'Item Sales Report',
    description:
      'Select a confirmed date range and see which menu item groups like Soup or Farsan sold the most.',
    eyebrow: 'Sales',
  },
  {
    type: 'eventPlanner',
    title: 'Event Planner Report',
    description:
      'Track which confirmed bookings were attached to which event planner with assignment date, function details, and guest count.',
    eyebrow: 'Planning',
  },
];

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

  return (
    <div className="space-y-6">
      <section className="rounded-2xl border border-slate-200 bg-white p-6 shadow-sm">
        <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.25em] text-amber-600">
              Reports
            </p>
            <h1 className="mt-2 text-2xl font-bold text-slate-900 sm:text-3xl">
              Select Report
            </h1>
            <p className="mt-2 max-w-3xl text-sm text-slate-500">
              Choose a report type first. Filters, preview, and download are handled on the next page.
            </p>
          </div>
          <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
            Static export ready
          </div>
        </div>

        <div className="mt-6 grid gap-4 md:grid-cols-2 xl:grid-cols-3">
          {REPORT_CARDS.map((card) => (
            <Link
              key={card.type}
              href={`/reports/view?type=${card.type}`}
              className="rounded-[28px] border border-slate-200 bg-white p-5 text-left shadow-sm transition hover:border-amber-200 hover:shadow-md"
            >
              <p className="text-[10px] font-semibold uppercase tracking-[0.3em] text-amber-600">
                {card.eyebrow}
              </p>
              <h2 className="mt-3 text-xl font-bold text-slate-900">{card.title}</h2>
              <p className="mt-2 text-sm leading-6 text-slate-500">{card.description}</p>
              <div className="mt-5 inline-flex items-center rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                Open report
              </div>
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}

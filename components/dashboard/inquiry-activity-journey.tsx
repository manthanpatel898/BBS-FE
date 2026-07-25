'use client';

import type { InquiryActivity } from '@/lib/auth/types';
import { buildInquiryJourney } from '@/lib/dashboard/banquet-dashboard-presenters';

export function InquiryActivityJourney({
  activity,
  selectedYear,
  selectedMonth,
  onMonthChange,
}: {
  activity: InquiryActivity;
  selectedYear: number;
  selectedMonth: number;
  onMonthChange: (month: number) => void;
}) {
  const now = new Date();
  const journey = buildInquiryJourney(activity.selectedMonth);
  const availableMonths =
    selectedYear === now.getFullYear() ? now.getMonth() + 1 : 12;
  const stages = [
    {
      label: 'Inquiries created',
      value: journey.created,
      helper: 'New opportunities',
      tone: 'bg-amber-400',
    },
    {
      label: 'Bookings confirmed',
      value: journey.confirmed,
      helper: `${journey.pending} awaiting conversion`,
      tone: 'bg-emerald-500',
    },
    {
      label: 'Conversion rate',
      value: `${journey.conversionRate.toFixed(1)}%`,
      helper: 'Created to confirmed',
      tone: 'bg-slate-900',
    },
  ];

  return (
    <section className="overflow-hidden rounded-[28px] border border-amber-100 bg-white shadow-[0_18px_46px_rgba(15,23,42,0.08)]">
      <div className="bg-[radial-gradient(circle_at_top_right,rgba(251,191,36,0.32),transparent_48%),linear-gradient(135deg,#0f172a,#1e293b)] px-5 py-5 text-white sm:px-6">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.24em] text-amber-300">
              Conversion journey
            </p>
            <h3 className="mt-2 text-xl font-extrabold">Inquiry Activity</h3>
            <p className="mt-1 text-sm text-slate-300">
              Track inquiries by the date they were created and confirmed.
            </p>
          </div>
          <select
            aria-label="Inquiry activity month"
            value={selectedMonth}
            onChange={(event) => onMonthChange(Number(event.target.value))}
            className="min-h-11 w-full rounded-xl border border-white/20 bg-white px-3 py-2 text-sm font-bold text-slate-900 outline-none focus:ring-2 focus:ring-amber-300 sm:w-auto"
          >
            {Array.from({ length: availableMonths }, (_, index) => index + 1).map(
              (month) => (
                <option key={month} value={month}>
                  {new Intl.DateTimeFormat('en-IN', { month: 'long' }).format(
                    new Date(2026, month - 1, 1),
                  )}
                </option>
              ),
            )}
          </select>
        </div>
      </div>

      <div className="p-5 sm:p-6">
        <div className="grid gap-3 md:grid-cols-3">
          {stages.map((stage, index) => (
            <div
              key={stage.label}
              className="relative min-w-0 rounded-2xl border border-slate-200 bg-slate-50 p-4"
            >
              {index < stages.length - 1 ? (
                <span
                  aria-hidden="true"
                  className="absolute -right-2 top-1/2 z-10 hidden h-4 w-4 -translate-y-1/2 rotate-45 border-r border-t border-slate-200 bg-slate-50 md:block"
                />
              ) : null}
              <div className="flex items-center justify-between gap-3">
                <span className={`h-2.5 w-2.5 rounded-full ${stage.tone}`} />
                <span className="text-[10px] font-bold uppercase tracking-[0.18em] text-slate-400">
                  Stage {index + 1}
                </span>
              </div>
              <p className="mt-4 text-xs font-bold uppercase tracking-[0.12em] text-slate-500">
                {stage.label}
              </p>
              <p className="mt-2 break-words text-3xl font-black text-slate-950">
                {stage.value}
              </p>
              <p className="mt-1 text-xs font-medium text-slate-500">
                {stage.helper}
              </p>
              <div className="mt-4 h-2 overflow-hidden rounded-full bg-slate-200">
                <div
                  className={`h-full rounded-full ${stage.tone}`}
                  style={{
                    width: `${
                      index === 0
                        ? 100
                        : index === 1
                          ? journey.conversionRate
                          : journey.conversionRate
                    }%`,
                  }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="mt-4 grid gap-3 sm:grid-cols-2">
          {[
            { label: 'Today', data: activity.today },
            { label: 'Yesterday', data: activity.yesterday },
          ].map((period) => (
            <div
              key={period.label}
              className="flex min-w-0 items-center justify-between gap-4 rounded-2xl border border-slate-200 bg-white p-4"
            >
              <div>
                <p className="text-xs font-black uppercase tracking-[0.16em] text-slate-500">
                  {period.label}
                </p>
                <p className="mt-1 text-xs text-slate-400">Activity snapshot</p>
              </div>
              <div className="grid grid-cols-2 gap-4 text-right">
                <div>
                  <p className="text-xl font-black text-slate-950">
                    {period.data.created}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Created
                  </p>
                </div>
                <div>
                  <p className="text-xl font-black text-emerald-600">
                    {period.data.confirmed}
                  </p>
                  <p className="text-[10px] font-bold uppercase text-slate-400">
                    Confirmed
                  </p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

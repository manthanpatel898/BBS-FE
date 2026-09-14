'use client';

import type { ReactNode } from 'react';
import type { CancelledAdvanceDashboard, DashboardRecordType, InquiryActivity, MonthlySales, OrderReports, OrderStats } from '@/lib/auth/types';
import { InquiryActivityJourney } from './inquiry-activity-journey';
import { CollectionsOverview, SalesOverview } from './finance-overview';
import { HorizontalCategoryPerformance } from './banquet-analytics-sections';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);

function Metric({ label, value, note, onClick }: { label: string; value: ReactNode; note?: string; onClick?: () => void }) {
  const body = <><span className="zb-next-label">{label}</span><strong className="zb-next-value">{value}</strong>{note ? <span className="zb-next-note">{note}</span> : null}{onClick ? <span className="zb-next-link">View records ↗</span> : null}</>;
  return onClick ? <button type="button" className="zb-next-metric" onClick={onClick}>{body}</button> : <div className="zb-next-metric">{body}</div>;
}

export function SinglePageDashboard({ stats, reports, inquiryActivity, monthlySales, selectedYear, selectedActivityMonth, onActivityMonthChange, onMonthlySalesOpen, onSelectRecordType, cancelledAdvanceDashboard, subscription }: {
  stats: OrderStats; reports: OrderReports | null; inquiryActivity: InquiryActivity | null; monthlySales: MonthlySales | null;
  selectedYear: number; selectedActivityMonth: number; onActivityMonthChange: (month: number) => void; onMonthlySalesOpen: (month: number) => void;
  onSelectRecordType: (type: DashboardRecordType) => void;
  cancelledAdvanceDashboard: CancelledAdvanceDashboard | null; subscription: ReactNode;
}) {
  const counts = stats.dashboardRecords;
  return <div className="zb-dashboard-next">
    <section className="zb-next-hero" aria-label="Confirmed booking value">
      <div><p className="zb-next-eyebrow">{selectedYear} · Confirmed booking value</p><strong>{money(stats.monthRevenue)}</strong><p>Booking value, separate from advance collected</p></div>
      <div className="zb-next-hall" aria-hidden="true"><div className="zb-next-floor">{Array.from({ length: 6 }, (_, i) => <span key={i} />)}</div></div>
    </section>
    <div className="zb-next-metrics">
      <Metric label="Inquiries · Last 7 Days" value={counts?.recent_inquiries ?? 0} onClick={() => onSelectRecordType('recent_inquiries')} />
      <Metric label="Confirmed · Last 7 Days" value={counts?.recent_confirmed ?? 0} onClick={() => onSelectRecordType('recent_confirmed')} />
      <Metric label="Follow Ups" value={`${stats.followUpsTakenToday ?? 0} / ${stats.followUpsDueTotalToday ?? stats.followUps}`} note="Completed today / due today" onClick={() => onSelectRecordType('followups')} />
      <Metric label="Completed Event" value={counts?.completed ?? stats.completed} onClick={() => onSelectRecordType('completed')} />
      <Metric label="Closed Inquiries" value={counts?.cancelled ?? stats.cancelled} onClick={() => onSelectRecordType('cancelled')} />
      <Metric label="Total Order Records" value={stats.total} note="All statuses combined" />
      <Metric label="Confirmation Rate" value={`${stats.confirmationConversionRate.toFixed(1)}%`} note="Inquiry to confirmed/completed" />
      <Metric label="Avg Inquiry To Confirm" value={`${stats.avgInquiryToConfirmationDays.toFixed(1)} days`} note={`${stats.inquiryToConfirmationSampleCount} confirmed bookings`} />
    </div>
    <h2 className="zb-next-section-title">Collections & advances</h2>
    <CollectionsOverview total={stats.upcomingConfirmedAdvance ?? (stats.upcomingConfirmedAdvanceByPaymentMethod ?? []).reduce((sum, item) => sum + item.amount, 0)} methods={stats.upcomingConfirmedAdvanceByPaymentMethod ?? []} cancelled={cancelledAdvanceDashboard} />
    <h2 className="zb-next-section-title">Inquiry activity</h2>
    {inquiryActivity ? <InquiryActivityJourney activity={inquiryActivity} selectedYear={selectedYear} selectedMonth={selectedActivityMonth} onMonthChange={onActivityMonthChange} /> : <p className="zb-next-empty">Inquiry activity is unavailable. Please refresh to retry.</p>}
    <h2 className="zb-next-section-title">Sales & business performance</h2>
    <SalesOverview data={monthlySales} reports={reports} onMonthOpen={onMonthlySalesOpen} />
    {reports ? <HorizontalCategoryPerformance items={reports.highestSellingCategories} /> : null}
    {subscription}
  </div>;
}

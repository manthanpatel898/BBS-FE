'use client';

import type { ReactNode } from 'react';
import type { DashboardRecordType, InquiryActivity, MonthlySales, OrderReports, OrderStats } from '@/lib/auth/types';
import { InquiryActivityJourney } from './inquiry-activity-journey';
import { MonthlySalesBoard } from './monthly-sales-board';
import { HorizontalCategoryPerformance } from './banquet-analytics-sections';
import { MenuCategoryTrends } from './menu-category-trends';

const money = (value: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(value);
const duration = (seconds: number) => seconds > 0 ? `${Math.floor(seconds / 60)}m ${Math.round(seconds % 60)}s` : '0m';

function Metric({ label, value, note, onClick }: { label: string; value: ReactNode; note?: string; onClick?: () => void }) {
  const body = <><span className="zb-next-label">{label}</span><strong className="zb-next-value">{value}</strong>{note ? <span className="zb-next-note">{note}</span> : null}{onClick ? <span className="zb-next-link">View records ↗</span> : null}</>;
  return onClick ? <button type="button" className="zb-next-metric" onClick={onClick}>{body}</button> : <div className="zb-next-metric">{body}</div>;
}

export function SinglePageDashboard({ stats, reports, inquiryActivity, monthlySales, selectedYear, selectedActivityMonth, onActivityMonthChange, onMonthlySalesOpen, onSelectRecordType, advances, cancelledAdvances, comparison, subscription }: {
  stats: OrderStats; reports: OrderReports | null; inquiryActivity: InquiryActivity | null; monthlySales: MonthlySales | null;
  selectedYear: number; selectedActivityMonth: number; onActivityMonthChange: (month: number) => void; onMonthlySalesOpen: (month: number) => void;
  onSelectRecordType: (type: DashboardRecordType) => void;
  advances: ReactNode; cancelledAdvances: ReactNode; comparison: ReactNode; subscription: ReactNode;
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
    <div className="zb-next-stack">{advances}{cancelledAdvances}</div>
    <h2 className="zb-next-section-title">Inquiry activity</h2>
    {inquiryActivity ? <InquiryActivityJourney activity={inquiryActivity} selectedYear={selectedYear} selectedMonth={selectedActivityMonth} onMonthChange={onActivityMonthChange} /> : <p className="zb-next-empty">Inquiry activity is unavailable. Please refresh to retry.</p>}
    <h2 className="zb-next-section-title">Sales & business performance</h2>
    {reports ? <>
      {comparison}
      <div className="zb-next-pair">
        <section className="zb-next-panel"><h3>Peak Sales Month</h3><p className="zb-next-note">Best performing month from confirmed bookings</p><p className="zb-next-peak">{reports.busiestMonth.label}</p><div className="zb-next-pair"><div><strong className="zb-next-value">{reports.busiestMonth.bookings}</strong><span className="zb-next-note">Bookings</span></div><div><strong className="zb-next-value">{money(reports.busiestMonth.revenue)}</strong><span className="zb-next-note">Booking value</span></div></div></section>
        <HorizontalCategoryPerformance items={reports.highestSellingCategories} />
      </div>
    </> : <p className="zb-next-empty">Reports are unavailable. Please refresh to retry.</p>}
    {monthlySales ? <MonthlySalesBoard data={monthlySales} currentYear={new Date().getFullYear()} currentMonth={new Date().getMonth() + 1} onMonthOpen={onMonthlySalesOpen} /> : <p className="zb-next-empty">Monthly sales are unavailable. Please refresh to retry.</p>}
    <h2 className="zb-next-section-title">Menu performance</h2>
    {reports ? <section className="zb-next-panel"><h3>Best-selling menu items</h3>
      {reports.bestSellingMenuItems.length ? <div className="zb-next-stack">{reports.bestSellingMenuItems.map((item) => <div key={item.name}>
        <div className="flex flex-wrap items-center justify-between gap-2 py-3"><span className="text-sm font-semibold">{item.name}</span><span className="zb-next-note">{item.count.toLocaleString('en-IN')} selections</span></div>
        <div className="h-2 overflow-hidden rounded-full bg-slate-100" aria-hidden="true"><div className="h-full rounded-full bg-amber-400" style={{ width: `${Math.max(0, item.count) / Math.max(1, ...reports.bestSellingMenuItems.map((entry) => entry.count)) * 100}%` }} /></div>
      </div>)}</div> : <p className="zb-next-note">Menu selections will appear after confirmed bookings have saved menus.</p>}
    </section> : null}
    {reports ? <MenuCategoryTrends groups={reports.menuItemTrendsByCategory} /> : <p className="zb-next-empty">Menu trends are unavailable. Please refresh to retry.</p>}
    <div className="zb-next-metrics">
      <Metric label="Avg Menu Selection" value={duration(stats.avgMenuSelectionDurationSeconds)} note={`${stats.menuSelectionSampleCount} saved sessions`} />
      <Metric label="Initial Menu Selection" value={duration(stats.avgInitialMenuSelectionDurationSeconds)} />
      <Metric label="Category Change" value={duration(stats.avgCategoryChangeDurationSeconds)} />
      {subscription}
    </div>
  </div>;
}

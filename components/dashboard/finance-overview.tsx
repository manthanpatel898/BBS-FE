'use client';

import type { CSSProperties } from 'react';
import type { CancelledAdvanceDashboard, MonthlySales, OrderReports, ReportMetric } from '@/lib/auth/types';

const money = (n: number) => new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(n);
const colors = ['#ffbb00', '#17233b', '#8e9bb2', '#c77816', '#566b88'];
type Method = { label: string; amount: number; count: number };

function MethodList({ items }: { items: Method[] }) {
  return <dl className="zb-fin-methods">{items.map((item, index) => <div key={item.label}><dt><span className="zb-fin-dot" style={{ background: colors[index % colors.length] }} />{item.label}<small>{item.count} entries</small></dt><dd>{money(item.amount)}</dd></div>)}</dl>;
}

export function CollectionsOverview({ total, methods, cancelled }: { total: number; methods: Method[]; cancelled: CancelledAdvanceDashboard | null }) {
  const positive = methods.filter((m) => m.amount > 0 || m.count > 0);
  const sum = positive.reduce((n, m) => n + Math.max(0, m.amount), 0);
  return <div className="zb-fin-grid">
    <section className="zb-fin-card zb-fin-collection"><header><div><p className="zb-fin-kicker">Future confirmed bookings</p><h3>Advance collected</h3></div><span className="zb-fin-symbol" aria-hidden="true">₹</span></header>
      <strong className="zb-fin-total">{money(total)}</strong><p className="zb-fin-muted">Money received · not total booking value</p>
      <div className="zb-fin-segments" aria-hidden="true">{positive.map((item, i) => <span key={item.label} style={{ width: `${sum ? Math.max(0, item.amount) / sum * 100 : 0}%`, background: colors[i % colors.length] }} />)}</div>
      {positive.length ? <MethodList items={positive} /> : <p className="zb-fin-muted">No advance payments for upcoming confirmed bookings.</p>}
    </section>
    <section className="zb-fin-card"><header><div><p className="zb-fin-kicker">Cancellations {cancelled?.year}</p><h3>Advance settlement</h3></div><a className="zb-fin-action" href="/reports/view">Treasury report ↗</a></header>
      {cancelled ? <><div className="zb-fin-settlement"><div><span>Total received</span><strong>{money(cancelled.totalCancelledAdvance)}</strong><small>{cancelled.totalBookings} cancelled bookings</small></div><div><span>Held by company</span><strong>{money(cancelled.totalPendingAmount)}</strong><small>Pending settlement</small></div><div><span>Returned to customer</span><strong>{money(cancelled.totalPaidBack)}</strong><small>Paid back</small></div></div>
        <dl className="zb-fin-dispositions"><div><dt>Dine-in used</dt><dd>{money(cancelled.totalDineInUsed)}</dd></div><div><dt>Next booking used</dt><dd>{money(cancelled.totalNextBookingUsed)}</dd></div><div><dt>Forfeited</dt><dd>{money(cancelled.totalForfeited)}</dd></div></dl>
        <details className="zb-fin-details"><summary>Settlement by payment method</summary><h4>Paid back</h4>{cancelled.paidBackByMethod.length ? <MethodList items={cancelled.paidBackByMethod} /> : <p className="zb-fin-muted">No paybacks recorded.</p>}<h4>Pending with company</h4>{cancelled.pendingByMethod.length ? <MethodList items={cancelled.pendingByMethod} /> : <p className="zb-fin-muted">No pending balance.</p>}</details>
      </> : <p className="zb-fin-muted">Cancellation data is unavailable. Please refresh to retry.</p>}
    </section>
  </div>;
}

function Comparison({ title, current, previous }: { title: string; current: ReportMetric; previous: ReportMetric }) {
  const delta = previous.revenue > 0 ? (current.revenue - previous.revenue) / previous.revenue * 100 : null;
  const max = Math.max(current.revenue, previous.revenue, 1);
  return <section className="zb-fin-card"><header><h3>{title}</h3><span className="zb-fin-change">{delta === null ? 'No comparison baseline' : `${delta >= 0 ? '+' : ''}${delta.toFixed(1)}%`}</span></header>
    {[current, previous].map((item, i) => <div className="zb-fin-comparison" key={`${i}-${item.label}`}><div><span>{item.label} · {item.bookings} bookings</span><strong>{money(item.revenue)}</strong></div><div className="zb-fin-track" aria-hidden="true"><span style={{ width: `${Math.max(0, item.revenue) / max * 100}%`, background: i ? '#8996ab' : '#ffbb00' }} /></div></div>)}
  </section>;
}

export function SalesOverview({ data, reports, onMonthOpen }: { data: MonthlySales | null; reports: OrderReports | null; onMonthOpen: (month: number) => void }) {
  const largestValue = Math.max(0, ...(data?.months.flatMap((m) => [m.actualRevenue, m.estimatedRevenue]) ?? []));
  const max = Math.max(1, largestValue);
  return <div className="zb-next-stack">
    <section className="zb-fin-card"><header><div><p className="zb-fin-kicker">Annual performance {data?.year}</p><h3>Monthly sales</h3></div><p className="zb-fin-muted">Select a month to open its booking report ↗</p></header>
      {data ? <><div className="zb-fin-sales-totals">{[['Effective value', money(data.totals.effectiveRevenue)], ['Actual', money(data.totals.actualRevenue)], ['Estimated', money(data.totals.estimatedRevenue)], ['Bookings', data.totals.bookings]].map(([label, value]) => <div key={label}><span>{label}</span><strong>{value}</strong></div>)}</div>
        <p className="zb-fin-muted">Estimates use the current average plate price of {money(data.averagePlatePrice)}. Not cash collected.</p>
        <div className="zb-fin-legend"><span><i className="zb-fin-dot" style={{ background: '#ffbb00' }} />Actual</span><span><i className="zb-fin-dot" style={{ background: '#8e9bb2' }} />Estimated</span><span>Shared scale · max {money(largestValue)}</span></div>
        {data.months.length ? <div className="zb-fin-months">{data.months.map((month) => <button type="button" key={month.month} className="zb-fin-month" onClick={() => onMonthOpen(month.month)} aria-label={`${month.label}: ${month.bookings} bookings, actual ${money(month.actualRevenue)}, estimated ${money(month.estimatedRevenue)}, effective ${money(month.effectiveRevenue)}. Open booking report.`}>
          <span className="zb-fin-bars" aria-hidden="true"><i style={{ '--bar-height': `${Math.max(0, month.actualRevenue) / max * 100}%` } as CSSProperties} /><i style={{ '--bar-height': `${Math.max(0, month.estimatedRevenue) / max * 100}%` } as CSSProperties} /></span><strong>{month.label}</strong><span className="zb-fin-month-amount">{money(month.effectiveRevenue)}</span><small>{month.bookings} bookings</small>
        </button>)}</div> : <p className="zb-fin-muted">No monthly sales records.</p>}
        <details className="zb-fin-details"><summary>Exact monthly figures</summary><div className="zb-fin-table-wrap"><table><thead><tr><th>Month</th><th>Actual</th><th>Estimated</th><th>Effective</th><th>Estimated bookings</th></tr></thead><tbody>{data.months.map((m) => <tr key={m.month}><th>{m.label}</th><td>{money(m.actualRevenue)}</td><td>{money(m.estimatedRevenue)}</td><td>{money(m.effectiveRevenue)}</td><td>{m.estimatedBookings}</td></tr>)}</tbody></table></div></details>
      </> : <p className="zb-fin-muted">Monthly sales are unavailable. Please refresh to retry.</p>}
    </section>
    {reports ? <><div className="zb-fin-grid"><Comparison title="Year on year" {...reports.yearComparison} /><Comparison title="Month on month" {...reports.monthComparison} /></div><section className="zb-fin-peak"><div><p className="zb-fin-kicker">Peak sales month</p><h3>{reports.busiestMonth.label}</h3></div><strong>{reports.busiestMonth.bookings}<small> confirmed bookings</small></strong><strong>{money(reports.busiestMonth.revenue)}<small> booking value</small></strong></section></> : <p className="zb-next-empty">Reports are unavailable. Please refresh to retry.</p>}
  </div>;
}

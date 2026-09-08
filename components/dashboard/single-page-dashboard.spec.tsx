import { strict as assert } from 'node:assert';
import { createElement } from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { SinglePageDashboard } from './single-page-dashboard';
import type { OrderStats, OrderReports } from '../../lib/auth/types';

const stats: OrderStats = { total: 137, inquiries: 90, confirmed: 30, cancelled: 4, completed: 13, followUps: 8, followUpsTakenToday: 3, followUpsDueTotalToday: 8, monthRevenue: 1234567, monthAdvance: 25000, monthAdvanceByPaymentMethod: [], avgMenuSelectionDurationSeconds: 120, avgInitialMenuSelectionDurationSeconds: 180, avgCategoryChangeDurationSeconds: 60, menuSelectionSampleCount: 9, avgInquiryToConfirmationDays: 2.5, inquiryToConfirmationSampleCount: 6, confirmationConversionRate: 31.4, dashboardRecords: { recent_inquiries: 19, recent_confirmed: 7 } };
export const props = { stats, reports: null, inquiryActivity: null, monthlySales: null, selectedYear: 2026, selectedActivityMonth: 9, onActivityMonthChange: () => {}, onMonthlySalesOpen: () => {}, onSelectRecordType: () => {}, advances: null, cancelledAdvances: null, comparison: null, subscription: null };
const html = renderToStaticMarkup(createElement(SinglePageDashboard, props));
assert.match(html, /₹12,34,567/);
assert.match(html, /137/);
assert.match(html, /3 \/ 8/);
assert.match(html, /31.4%/);
assert.match(html, /Reports are unavailable/);
assert.doesNotMatch(html, /₹18.40|sample data|demo data/i);
const empty = renderToStaticMarkup(createElement(SinglePageDashboard, { ...props, stats: { ...stats, monthRevenue: 0, total: 0, confirmationConversionRate: 0 } }));
assert.match(empty, /₹0/);
assert.doesNotMatch(empty, /NaN|Infinity/);
const reports: OrderReports = {
  highestSellingCategories: [{ name: 'Test category', bookings: 5, revenue: 78900 }],
  busiestMonth: { label: 'February', bookings: 11, revenue: 345600 },
  yearComparison: { current: { label: '2026', bookings: 20, revenue: 400000 }, previous: { label: '2025', bookings: 10, revenue: 200000 } },
  monthComparison: { current: { label: 'February', bookings: 11, revenue: 345600 }, previous: { label: 'January', bookings: 9, revenue: 54400 } },
  bestSellingMenuItems: [{ name: 'Fresh lime soda', count: 23, categories: ['Test category'] }],
  menuItemTrendsByCategory: [{ category: 'Test category', items: [{ name: 'Fresh lime soda', count: 17 }] }],
};
const populated = renderToStaticMarkup(createElement(SinglePageDashboard, { ...props, reports }));
assert.match(populated, /February/);
assert.match(populated, /₹3,45,600/);
assert.match(populated, /₹78,900/);
assert.match(populated, /23 selections/);
assert.match(populated, /17 selections/);
console.log('Single-page dashboard real-value and empty-data tests passed');

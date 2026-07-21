import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDecorationDashboardCards,
  formatIndianCurrency,
  buildDecorationMobileCalendarCard,
} from './dashboard-view.ts';

const dashboard = {
  todayEvents: 2,
  upcoming: 8,
  followupsDue: 3,
  openInquiries: 4,
  selectionPending: 4,
  byStatus: { INQUIRY: 5, CONFIRMED: 6 },
  packageValue: 250000,
  collected: 100000,
  outstanding: 150000,
  upcomingEvents: [],
  followupPriorities: [],
  futureBookings: 12,
};

test('maps dashboard metrics to inline record types', () => {
  const cards = buildDecorationDashboardCards(dashboard);

  assert.equal(cards.find((card) => card.id === 'today')?.value, '2');
  assert.equal(cards.find((card) => card.id === 'open-inquiries')?.value, '4');
  assert.equal(
    cards.find((card) => card.id === 'open-inquiries')?.recordType,
    'open_inquiries',
  );
  assert.equal(cards.some((card) => card.id === 'inventory-conflicts'), false);
  assert.equal(cards.some((card) => card.id === 'maintenance'), false);
  assert.equal(
    cards.find((card) => card.id === 'selection-pending')?.recordType,
    'selection_pending',
  );
  assert.equal(
    cards.find((card) => card.id === 'followups')?.recordType,
    'followups',
  );
});

test('builds a mobile calendar shortcut from all active future bookings', () => {
  assert.deepEqual(buildDecorationMobileCalendarCard(dashboard), {
    label: 'Calendar',
    value: '12',
    description: 'Future booking entries',
    href: '/decoration/events/',
  });
});

test('formats financial cards as Indian rupees', () => {
  const cards = buildDecorationDashboardCards(dashboard);
  assert.match(
    cards.find((card) => card.id === 'received')?.value ?? '',
    /₹1,00,000/,
  );
  assert.equal(formatIndianCurrency(150000), '₹1,50,000');
});

test('uses safe zero values when status buckets are absent', () => {
  const cards = buildDecorationDashboardCards({
    ...dashboard,
    byStatus: {}, openInquiries: 0,
  });
  assert.equal(cards.find((card) => card.id === 'open-inquiries')?.value, '0');
});

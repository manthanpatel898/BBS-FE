import test from 'node:test';
import assert from 'node:assert/strict';
import {
  buildDecorationDashboardCards,
  formatIndianCurrency,
} from './dashboard-view.ts';

const dashboard = {
  todayEvents: 2,
  upcoming: 8,
  followupsDue: 3,
  selectionPending: 4,
  byStatus: { INQUIRY: 5, CONFIRMED: 6 },
  packageValue: 250000,
  collected: 100000,
  outstanding: 150000,
  upcomingEvents: [],
  followupPriorities: [],
};

test('maps dashboard metrics to actionable filtered routes', () => {
  const cards = buildDecorationDashboardCards(dashboard);

  assert.equal(cards.find((card) => card.id === 'today')?.value, '2');
  assert.equal(
    cards.find((card) => card.id === 'open-inquiries')?.href,
    '/decoration/events?status=INQUIRY',
  );
  assert.equal(cards.some((card) => card.id === 'inventory-conflicts'), false);
  assert.equal(cards.some((card) => card.id === 'maintenance'), false);
  assert.equal(
    cards.find((card) => card.id === 'selection-pending')?.href,
    '/decoration/events?status=DECORATION_SELECTION_PENDING',
  );
  assert.equal(
    cards.find((card) => card.id === 'followups')?.href,
    '/decoration/followups?state=due',
  );
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
    byStatus: {},
  });
  assert.equal(cards.find((card) => card.id === 'open-inquiries')?.value, '0');
});

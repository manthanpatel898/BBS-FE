import test from 'node:test';
import assert from 'node:assert/strict';
import {
  decorationDashboardUrl,
  parseDecorationDashboardQuery,
} from './dashboard-query.ts';

test('parses supported static dashboard query state', () => {
  const parsed = parseDecorationDashboardQuery(
    new URLSearchParams('view=upcoming&page=2&bookingId=booking-1'),
  );
  assert.deepEqual(parsed, {
    view: 'upcoming',
    page: 2,
    bookingId: 'booking-1',
  });
});

test('normalizes unsupported and unsafe values', () => {
  assert.deepEqual(
    parseDecorationDashboardQuery(
      new URLSearchParams('view=unknown&page=-2&bookingId='),
    ),
    { view: null, page: 1, bookingId: null },
  );
});

test('builds static route URLs without dynamic segments', () => {
  assert.equal(
    decorationDashboardUrl({ view: 'today', page: 3, bookingId: 'b 1' }),
    '/decoration/dashboard/?view=today&page=3&bookingId=b+1',
  );
  assert.equal(decorationDashboardUrl({}), '/decoration/dashboard/');
});

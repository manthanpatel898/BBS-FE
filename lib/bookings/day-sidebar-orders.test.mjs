import assert from 'node:assert/strict';
import test from 'node:test';

import { getDaySidebarOrders } from './day-sidebar-orders.ts';

test('returns the latest calendar records instead of a popup-time snapshot', () => {
  const dateKey = '2026-07-16';
  const initial = new Map([[dateKey, [{ id: 'booking-1', hallDetails: null }]]]);
  const refreshed = new Map([[dateKey, [{ id: 'booking-1', hallDetails: 'Hall 3' }]]]);

  assert.equal(getDaySidebarOrders(dateKey, initial)[0].hallDetails, null);
  assert.equal(getDaySidebarOrders(dateKey, refreshed)[0].hallDetails, 'Hall 3');
});

test('returns only records for the selected date', () => {
  const orders = new Map([
    ['2026-07-16', [{ id: 'booking-1' }]],
    ['2026-07-17', [{ id: 'booking-2' }]],
  ]);

  assert.deepEqual(getDaySidebarOrders('2026-07-16', orders), [{ id: 'booking-1' }]);
});

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  bookingIntersectsDate,
  getDecorationPaymentState,
  getDecorationStatusMeta,
  getLatestDecorationFollowup,
  normalizeDecorationFollowups,
} from './booking-view.ts';

function fixture(overrides = {}) {
  return {
    id: 'booking-1',
    packageRate: 100000,
    totalCollected: 0,
    outstandingAmount: 100000,
    startDate: '2026-07-17',
    endDate: '2026-07-17',
    followups: [],
    ...overrides,
  };
}

test('derives unpaid, partial, and paid payment states', () => {
  assert.equal(getDecorationPaymentState(fixture()), 'UNPAID');
  assert.equal(
    getDecorationPaymentState(
      fixture({ totalCollected: 25000, outstandingAmount: 75000 }),
    ),
    'PARTIAL',
  );
  assert.equal(
    getDecorationPaymentState(
      fixture({ totalCollected: 100000, outstandingAmount: 0 }),
    ),
    'PAID',
  );
});

test('normalizes legacy followups and selects the latest pending next action', () => {
  const followups = normalizeDecorationFollowups([
    {
      _id: 'followup-1',
      date: '2026-07-10',
      nextDate: '2026-07-18',
      note: 'Call customer',
      recordedBy: 'Manthan',
    },
    {
      _id: 'followup-2',
      date: '2026-07-11',
      nextDate: '2026-07-19',
      note: 'Completed call',
      recordedBy: 'Manthan',
      status: 'COMPLETED',
    },
    {
      _id: 'followup-3',
      date: '2026-07-12',
      nextDate: '2026-07-17',
      note: 'Earlier pending call',
      recordedBy: 'Manthan',
      status: 'PENDING',
    },
  ]);

  assert.equal(followups[0].id, 'followup-1');
  assert.equal(followups[0].status, 'PENDING');
  assert.equal(getLatestDecorationFollowup({ ...fixture(), followups })?.id, 'followup-3');
});

test('uses inclusive date keys for multi-day events without timezone drift', () => {
  const booking = fixture({
    startDate: '2026-07-17T00:00:00.000Z',
    endDate: '2026-07-19T00:00:00.000Z',
  });

  assert.equal(bookingIntersectsDate(booking, '2026-07-16'), false);
  assert.equal(bookingIntersectsDate(booking, '2026-07-17'), true);
  assert.equal(bookingIntersectsDate(booking, '2026-07-18'), true);
  assert.equal(bookingIntersectsDate(booking, '2026-07-19'), true);
  assert.equal(bookingIntersectsDate(booking, '2026-07-20'), false);
});

test('provides readable metadata for every decoration booking status', () => {
  const statuses = [
    'INQUIRY',
    'CONFIRMED',
    'DECORATION_SELECTION_PENDING',
    'DECORATION_SELECTED',
    'IN_PROGRESS',
    'COMPLETED',
    'CANCELLED',
    'CLOSED_INQUIRY',
  ];

  for (const status of statuses) {
    const metadata = getDecorationStatusMeta(status);
    assert.ok(metadata.label.length > 0);
    assert.match(metadata.badgeClass, /text-/);
    assert.match(metadata.dotClass, /bg-/);
  }
});

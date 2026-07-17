import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countDecorationStatuses,
  getDecorationDayBookings,
  groupDecorationBookingsByDate,
  isLatestDecorationCalendarRequest,
  replaceDecorationBooking,
} from './calendar.ts';

test('shows a multi-day decoration event on every covered date', () => {
  const booking = { id: 'event-1', startDate: '2026-07-30T00:00:00.000Z', endDate: '2026-08-02T00:00:00.000Z' };
  const grouped = groupDecorationBookingsByDate([booking]);
  assert.deepEqual([...grouped.keys()], ['2026-07-30', '2026-07-31', '2026-08-01', '2026-08-02']);
  assert.equal(grouped.get('2026-08-01')?.[0], booking);
});

test('does not mutate or duplicate a single-day event', () => {
  const booking = { id: 'event-2', startDate: '2026-07-12', endDate: '2026-07-12' };
  const grouped = groupDecorationBookingsByDate([booking]);
  assert.equal(grouped.size, 1);
  assert.equal(grouped.get('2026-07-12')?.length, 1);
});

test('sorts selected-day events by slot start then customer name', () => {
  const rows = [
    { id: 'evening', startDate: '2026-07-17', endDate: '2026-07-17', startTime: '18:00', customer: { name: 'Beta' }, status: 'CONFIRMED' },
    { id: 'morning-z', startDate: '2026-07-17', endDate: '2026-07-18', startTime: '09:00', customer: { name: 'Zeta' }, status: 'INQUIRY' },
    { id: 'morning-a', startDate: '2026-07-16', endDate: '2026-07-17', startTime: '09:00', customer: { name: 'Alpha' }, status: 'CONFIRMED' },
  ];
  assert.deepEqual(getDecorationDayBookings(rows, '2026-07-17').map((row) => row.id), ['morning-a', 'morning-z', 'evening']);
});

test('counts every status in the selected day without mutating rows', () => {
  const rows = [
    { id: '1', status: 'CONFIRMED' },
    { id: '2', status: 'CONFIRMED' },
    { id: '3', status: 'INQUIRY' },
  ];
  assert.deepEqual(countDecorationStatuses(rows), { CONFIRMED: 2, INQUIRY: 1 });
  assert.equal(rows.length, 3);
});

test('reconciles an updated booking by id and appends newly-created bookings', () => {
  const current = [{ id: '1', value: 'old' }, { id: '2', value: 'same' }];
  assert.deepEqual(replaceDecorationBooking(current, { id: '1', value: 'new' }), [{ id: '1', value: 'new' }, { id: '2', value: 'same' }]);
  assert.deepEqual(replaceDecorationBooking(current, { id: '3', value: 'created' }), [...current, { id: '3', value: 'created' }]);
});

test('rejects a stale calendar response after a newer request starts', () => {
  assert.equal(isLatestDecorationCalendarRequest(3, 3), true);
  assert.equal(isLatestDecorationCalendarRequest(2, 3), false);
});

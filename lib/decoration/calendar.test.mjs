import test from 'node:test';
import assert from 'node:assert/strict';
import { groupDecorationBookingsByDate } from './calendar.ts';

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

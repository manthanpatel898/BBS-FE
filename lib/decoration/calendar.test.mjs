import test from 'node:test';
import assert from 'node:assert/strict';
import {
  countDecorationStatuses,
  getDecorationDayBookings,
  groupDecorationBookingsByDate,
  isLatestDecorationCalendarRequest,
  replaceDecorationBooking,
  getDecorationCalendarCellState,
  getOrLoadDecorationHotDateYear,
} from './calendar.ts';

test('shows a legacy multi-day decoration event only on its event start date', () => {
  const booking = { id: 'event-1', startDate: '2026-07-30T00:00:00.000Z', endDate: '2026-08-02T00:00:00.000Z' };
  const grouped = groupDecorationBookingsByDate([booking]);
  assert.deepEqual([...grouped.keys()], ['2026-07-30']);
  assert.equal(grouped.get('2026-07-30')?.[0], booking);
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
  assert.deepEqual(getDecorationDayBookings(rows, '2026-07-17').map((row) => row.id), ['morning-z', 'evening']);
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

test('selected calendar date takes precedence over today and remains selected', () => {
  assert.deepEqual(getDecorationCalendarCellState('2026-07-18', '2026-07-17', '2026-07-18'), { isToday: false, isSelected: true });
  assert.deepEqual(getDecorationCalendarCellState('2026-07-17', '2026-07-17', '2026-07-18'), { isToday: true, isSelected: false });
});

test('shares one hot-date request per year and retries a failed year', async () => {
  const cache = new Map();
  const pending = new Map();
  let calls = 0;
  const loader = async () => {
    calls += 1;
    return [{ id: 'hot-1', date: '2026-07-24', description: 'Wedding season' }];
  };
  const [first, second] = await Promise.all([
    getOrLoadDecorationHotDateYear(cache, pending, 2026, loader),
    getOrLoadDecorationHotDateYear(cache, pending, 2026, loader),
  ]);
  assert.equal(calls, 1);
  assert.equal(first, second);

  let failures = 0;
  await assert.rejects(
    getOrLoadDecorationHotDateYear(cache, pending, 2027, async () => {
      failures += 1;
      throw new Error('offline');
    }),
  );
  await getOrLoadDecorationHotDateYear(cache, pending, 2027, async () => {
    failures += 1;
    return [];
  });
  assert.equal(failures, 2);
});

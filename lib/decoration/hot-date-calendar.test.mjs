import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import {
  getDecorationCalendarCellState,
  indexDecorationHotDates,
  isLatestDecorationHotDateRequest,
} from './calendar.ts';

test('combines selected, booking, and hot-date state without hiding bookings', () => {
  const hotDates = indexDecorationHotDates([
    { id: 'hot-1', date: '2026-07-24', description: 'Wedding season' },
  ]);
  assert.deepEqual(
    getDecorationCalendarCellState(
      '2026-07-24',
      '2026-07-23',
      '2026-07-24',
      2,
      hotDates,
    ),
    {
      isToday: false,
      isSelected: true,
      hasBookings: true,
      isHotDate: true,
      hotDateDescription: 'Wedding season',
    },
  );
});

test('rejects stale hot-date responses', () => {
  assert.equal(isLatestDecorationHotDateRequest(4, 4), true);
  assert.equal(isLatestDecorationHotDateRequest(3, 4), false);
});

test('calendar renders accessible red hot-date treatment', () => {
  const source = readFileSync(
    new URL('../../components/decoration/decoration-calendar.tsx', import.meta.url),
    'utf8',
  );
  assert.match(source, /hotDateDescription/);
  assert.match(source, /border-red-/);
  assert.match(source, /bg-red-/);
  assert.match(source, /aria-label/);
});

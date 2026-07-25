import { strict as assert } from 'node:assert';
import { getCalendarDayState } from '../lib/banquet/calendar-day-state';

assert.deepEqual(
  getCalendarDayState({
    dayKey: '2026-07-25',
    todayKey: '2026-07-25',
    selectedDayKey: '2026-07-28',
    hotDateKeys: new Set(),
  }),
  { isToday: true, isSelected: false, isHotDate: false },
);
assert.deepEqual(
  getCalendarDayState({
    dayKey: '2026-07-28',
    todayKey: '2026-07-25',
    selectedDayKey: '2026-07-28',
    hotDateKeys: new Set(['2026-07-28']),
  }),
  { isToday: false, isSelected: true, isHotDate: true },
);

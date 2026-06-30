import { strict as assert } from 'node:assert';
import { getForwardMonthQuickRange } from '../lib/report-date-ranges';

assert.deepEqual(
  getForwardMonthQuickRange(1, new Date('2026-06-28T10:00:00.000Z')),
  { from: '2026-06-01', to: '2026-06-30' },
);

assert.deepEqual(
  getForwardMonthQuickRange(3, new Date('2026-06-28T10:00:00.000Z')),
  { from: '2026-06-01', to: '2026-08-31' },
);

assert.deepEqual(
  getForwardMonthQuickRange(6, new Date('2026-11-15T10:00:00.000Z')),
  { from: '2026-11-01', to: '2027-04-30' },
);

assert.deepEqual(
  getForwardMonthQuickRange(12, new Date('2026-06-28T10:00:00.000Z')),
  { from: '2026-06-01', to: '2027-05-31' },
);

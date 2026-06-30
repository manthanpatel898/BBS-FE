import { strict as assert } from 'node:assert';
import { formatPrintEventDateTime } from '../lib/print-date';

assert.equal(
  formatPrintEventDateTime({
    eventDate: '2026-06-28T00:00:00.000Z',
    startTime: '19:00',
    endTime: '22:30',
  }),
  '28/06/2026 | Sunday | 07:00 PM - 10:30 PM',
);

assert.equal(
  formatPrintEventDateTime({
    eventDate: '2026-06-29T00:00:00.000Z',
    startTime: '11:00',
    endTime: null,
  }),
  '29/06/2026 | Monday | 11:00 AM',
);

assert.equal(
  formatPrintEventDateTime({
    eventDate: null,
    startTime: null,
    endTime: null,
  }),
  'Pending | Time pending',
);

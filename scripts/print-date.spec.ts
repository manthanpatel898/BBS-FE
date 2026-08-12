import { strict as assert } from 'node:assert';
import {
  formatAdvancePaymentDateTime,
  formatPrintEventDateTime,
} from '../lib/print-date';

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

assert.equal(
  formatAdvancePaymentDateTime(
    '2026-08-09T00:00:00.000Z',
    '2026-08-09T13:12:00.000Z',
  ),
  '09/08/2026, 06:42 PM',
);

assert.equal(
  formatAdvancePaymentDateTime('2026-08-09T00:00:00.000Z', null),
  '09/08/2026',
);

assert.equal(
  formatAdvancePaymentDateTime('2026-08-09T00:00:00.000Z', 'invalid'),
  '09/08/2026',
);

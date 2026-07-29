import { strict as assert } from 'node:assert';
import { canEditBanquetBookingDetails } from './booking-edit-window';

assert.equal(
  canEditBanquetBookingDetails(
    'CONFIRMED',
    '2026-07-29T00:00:00.000Z',
    '2026-07-29',
  ),
  true,
);
assert.equal(
  canEditBanquetBookingDetails(
    'CONFIRMED',
    '2026-07-30T00:00:00.000Z',
    '2026-07-29',
  ),
  true,
);
assert.equal(
  canEditBanquetBookingDetails(
    'CONFIRMED',
    '2026-07-28T00:00:00.000Z',
    '2026-07-29',
  ),
  false,
);
assert.equal(
  canEditBanquetBookingDetails('INQUIRY', '2026-07-20', '2026-07-29'),
  true,
);

import { strict as assert } from 'node:assert';
import {
  banquetDetailActionMode,
  canEditBanquetBookingDetails,
} from './booking-edit-window';

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

assert.equal(
  banquetDetailActionMode('2026-07-28T00:00:00.000Z', '2026-07-29'),
  'DOCUMENTS_ONLY',
);
assert.equal(
  banquetDetailActionMode('2026-07-29T00:00:00.000Z', '2026-07-29'),
  'FULL',
);
assert.equal(
  banquetDetailActionMode('2026-07-30T00:00:00.000Z', '2026-07-29'),
  'FULL',
);
assert.equal(banquetDetailActionMode(null, '2026-07-29'), 'FULL');
assert.equal(banquetDetailActionMode('invalid', '2026-07-29'), 'FULL');

import { strict as assert } from 'node:assert';
import {
  buildInquiryJourney,
  buildMonthlySalesPresentation,
} from '../lib/dashboard/banquet-dashboard-presenters';

assert.deepEqual(
  buildInquiryJourney({
    created: 10,
    confirmed: 12,
    conversionRate: 120,
  }),
  {
    created: 10,
    confirmed: 12,
    conversionRate: 100,
    pending: 0,
  },
);

assert.deepEqual(
  buildInquiryJourney({
    created: 0,
    confirmed: 0,
    conversionRate: Number.NaN,
  }),
  {
    created: 0,
    confirmed: 0,
    conversionRate: 0,
    pending: 0,
  },
);

const presentation = buildMonthlySalesPresentation(
  {
    month: 7,
    label: 'Jul',
    bookings: 2,
    actualRevenue: 80000,
    estimatedRevenue: 20000,
    effectiveRevenue: 100000,
    estimatedBookings: 1,
    revenue: 100000,
  },
  2026,
  7,
  2026,
);
assert.equal(presentation.actualPercent, 80);
assert.equal(presentation.estimatedPercent, 20);
assert.equal(presentation.isCurrent, true);
assert.equal(presentation.isFuture, false);

const futureEmpty = buildMonthlySalesPresentation(
  {
    month: 8,
    label: 'Aug',
    bookings: 0,
    actualRevenue: 0,
    estimatedRevenue: 0,
    effectiveRevenue: 0,
    estimatedBookings: 0,
    revenue: 0,
  },
  2026,
  7,
  2026,
);
assert.equal(futureEmpty.actualPercent, 0);
assert.equal(futureEmpty.estimatedPercent, 0);
assert.equal(futureEmpty.isFuture, true);

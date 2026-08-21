import assert from 'node:assert/strict';
import test from 'node:test';
import type { BookingReportResponse, Order } from '@/lib/auth/types';
import {
  buildBookingExportTotalRow,
  flattenBookingReport,
  getBookingPackageSummary,
} from './booking-report';

function reportResponse(): BookingReportResponse {
  return {
    rows: [
      {
        order: {
          id: 'order-1',
          additionalCategorySelections: [],
        } as unknown as Order,
        priceSource: 'PACKAGE',
        isEstimated: false,
        effectivePlatePrice: 800,
        effectiveGrandTotal: 104000,
        effectivePendingAmount: 94000,
        packageCount: 3,
        additionalCategoryTotal: 24000,
        packageSummary: 'Dinner (100 pax) | Breakfast (40 pax) | Lunch (20 pax)',
      },
    ],
    averagePlatePrice: 800,
    totals: {
      grandTotal: 104000,
      advanceAmount: 10000,
      pendingAmount: 94000,
      additionalCategoryTotal: 24000,
    },
  };
}

test('booking report retains package metadata returned by the backend', () => {
  const flattened = flattenBookingReport(reportResponse());
  assert.equal(flattened.rows[0].packageCount, 3);
  assert.equal(flattened.rows[0].additionalCategoryTotal, 24000);
  assert.equal(
    getBookingPackageSummary(flattened.rows[0]),
    'Dinner (100 pax) | Breakfast (40 pax) | Lunch (20 pax)',
  );
});

test('booking export total row includes additional package totals', () => {
  assert.deepEqual(
    buildBookingExportTotalRow(
      ['eventDate', 'additionalCategoryTotal', 'grandTotal', 'advanceAmount', 'pendingAmount'],
      reportResponse().totals,
    ),
    ['TOTAL', 24000, 104000, 10000, 94000],
  );
});

import { strict as assert } from 'node:assert';
import {
  buildBookingExportTotalRow,
  buildBookingReportFooterSections,
  flattenBookingReport,
  getBookingReportPrice,
  labelEstimatedValue,
  getPriceSourceLabel,
} from '../lib/reports/booking-report';
import type { BookingReportResponse, Order } from '../lib/auth/types';

const baseOrder = {
  id: 'booking-1',
  categorySnapshot: null,
  customPricePerPlate: null,
  inquiryCustomPrice: null,
  pricePerPlate: 0,
  grandTotal: 0,
  advanceAmount: 10000,
  pendingAmount: 0,
} as Order;

const response: BookingReportResponse = {
  averagePlatePrice: 600,
  rows: [
    {
      order: baseOrder,
      priceSource: 'ESTIMATED_AVERAGE',
      isEstimated: true,
      effectivePlatePrice: 600,
      effectiveGrandTotal: 62000,
      effectivePendingAmount: 52000,
      packageCount: 0,
      additionalCategoryTotal: 0,
      packageSummary: '',
    },
  ],
  totals: {
    grandTotal: 62000,
    advanceAmount: 10000,
    pendingAmount: 52000,
    additionalCategoryTotal: 0,
  },
};

const flattened = flattenBookingReport(response);
assert.equal(flattened.rows[0].effectiveGrandTotal, 62000);
assert.equal(flattened.rows[0].reportForecast.isEstimated, true);
assert.equal(getBookingReportPrice(flattened.rows[0]), 600);
assert.equal(getPriceSourceLabel('ESTIMATED_AVERAGE'), 'Estimated from average');
assert.equal(labelEstimatedValue(true, '₹600'), 'Estimated · ₹600');
assert.equal(labelEstimatedValue(false, '₹800'), '₹800');

assert.deepEqual(
  buildBookingExportTotalRow(
    ['customerName', 'pendingAmount', 'grandTotal', 'advanceAmount'],
    response.totals,
  ),
  ['TOTAL', 52000, 62000, 10000],
);

assert.equal(
  buildBookingExportTotalRow(
    ['grandTotal', 'advanceAmount', 'pendingAmount'],
    response.totals,
  ).every((value) => typeof value === 'number'),
  true,
);

assert.equal(
  buildBookingReportFooterSections(
    ['customerName', 'grandTotal', 'advanceAmount', 'pendingAmount'],
    response.totals,
  ),
  undefined,
);

assert.deepEqual(
  buildBookingReportFooterSections(
    ['customerName', 'grandTotal'],
    response.totals,
  ),
  [
    {
      title: 'Report Totals',
      rows: [
        { label: 'Grand Total', value: 62000 },
        { label: 'Advance Amount', value: 10000 },
        { label: 'Pending Amount', value: 52000 },
      ],
    },
  ],
);

assert.deepEqual(
  buildBookingExportTotalRow(
    ['eventDate', 'customerName'],
    response.totals,
  ),
  ['TOTAL', null],
);

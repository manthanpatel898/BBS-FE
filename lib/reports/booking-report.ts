import type {
  BookingReportResponse,
  BookingReportTotals,
  Order,
  PriceSource,
} from '@/lib/auth/types';

export type BookingReportOrder = Order & {
  reportForecast: {
    priceSource: PriceSource;
    isEstimated: boolean;
    effectivePlatePrice: number;
  };
  effectiveGrandTotal: number;
  effectivePendingAmount: number;
};

export function flattenBookingReport(response: BookingReportResponse) {
  return {
    ...response,
    rows: response.rows.map<BookingReportOrder>((row) => ({
      ...row.order,
      reportForecast: {
        priceSource: row.priceSource,
        isEstimated: row.isEstimated,
        effectivePlatePrice: row.effectivePlatePrice,
      },
      effectiveGrandTotal: row.effectiveGrandTotal,
      effectivePendingAmount: row.effectivePendingAmount,
    })),
  };
}

export function getBookingReportPrice(order: BookingReportOrder) {
  return order.reportForecast.effectivePlatePrice;
}

export function getPriceSourceLabel(source: PriceSource) {
  const labels: Record<PriceSource, string> = {
    CUSTOM: 'Custom price',
    PACKAGE: 'Package price',
    STORED: 'Stored price',
    ESTIMATED_AVERAGE: 'Estimated from average',
    UNAVAILABLE: 'Unavailable',
  };
  return labels[source];
}

export function buildBookingExportTotalRow(
  columnKeys: string[],
  totals: BookingReportTotals,
): Array<string | number | null> {
  const financialTotals: Record<string, number> = {
    grandTotal: totals.grandTotal,
    advanceAmount: totals.advanceAmount,
    pendingAmount: totals.pendingAmount,
  };
  return columnKeys.map((key, index) => {
    if (key in financialTotals) return financialTotals[key];
    return index === 0 ? 'TOTAL' : null;
  });
}

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
  packageCount: number;
  additionalCategoryTotal: number;
  packageSummary: string;
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
      packageCount: row.packageCount,
      additionalCategoryTotal: row.additionalCategoryTotal,
      packageSummary: row.packageSummary,
    })),
  };
}

export function getBookingPackageSummary(order: BookingReportOrder) {
  return order.packageSummary.trim() || '-';
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

export function labelEstimatedValue(isEstimated: boolean, value: string) {
  return isEstimated ? `Estimated · ${value}` : value;
}

export function buildBookingExportTotalRow(
  columnKeys: string[],
  totals: BookingReportTotals,
): Array<string | number | null> {
  const financialTotals: Record<string, number> = {
    additionalCategoryTotal: totals.additionalCategoryTotal,
    grandTotal: totals.grandTotal,
    advanceAmount: totals.advanceAmount,
    pendingAmount: totals.pendingAmount,
  };
  return columnKeys.map((key, index) => {
    if (key in financialTotals) return financialTotals[key];
    return index === 0 ? 'TOTAL' : null;
  });
}

export function buildBookingReportFooterSections(
  columnKeys: string[],
  totals: BookingReportTotals,
) {
  const selectedFinancialKeys = new Set(
    columnKeys.filter((key) =>
      ['additionalCategoryTotal', 'grandTotal', 'advanceAmount', 'pendingAmount'].includes(key),
    ),
  );
  if (selectedFinancialKeys.size === 4) return undefined;

  return [
    {
      title: 'Report Totals',
      rows: [
        { label: 'Grand Total', value: totals.grandTotal },
        { label: 'Additional Package Total', value: totals.additionalCategoryTotal },
        { label: 'Advance Amount', value: totals.advanceAmount },
        { label: 'Pending Amount', value: totals.pendingAmount },
      ],
    },
  ];
}

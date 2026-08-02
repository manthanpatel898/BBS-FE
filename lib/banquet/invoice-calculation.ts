import {
  BanquetInvoiceDiscountType,
  BanquetInvoicePreview,
  BanquetInvoiceTotals,
} from '@/lib/auth/types';

export function calculateInvoicePreviewTotals(
  preview: BanquetInvoicePreview,
  discountType: BanquetInvoiceDiscountType,
  discountValue: number,
): BanquetInvoiceTotals {
  const grossPaise = preview.lines.reduce(
    (sum, line) => sum + line.quantity * line.unitRatePaise,
    0,
  );
  const discountPaise =
    discountType === 'FIXED'
      ? discountValue
      : discountType === 'PERCENTAGE'
        ? Math.round((grossPaise * discountValue) / 10_000)
        : 0;
  const taxableSubtotalPaise = Math.max(grossPaise - discountPaise, 0);
  const taxPaise =
    preview.taxMode === 'NO_GST'
      ? 0
      : Math.round((taxableSubtotalPaise * preview.gstRateBps) / 10_000);
  const cgstPaise = preview.taxMode === 'CGST_SGST' ? Math.floor(taxPaise / 2) : 0;
  const sgstPaise = preview.taxMode === 'CGST_SGST' ? taxPaise - cgstPaise : 0;
  const igstPaise = preview.taxMode === 'IGST' ? taxPaise : 0;
  const grandTotalPaise = taxableSubtotalPaise + taxPaise;
  return {
    grossPaise,
    discountPaise,
    taxableSubtotalPaise,
    taxPaise,
    cgstPaise,
    sgstPaise,
    igstPaise,
    grandTotalPaise,
    advanceReceivedPaise: preview.totals.advanceReceivedPaise,
    balancePendingPaise: Math.max(
      grandTotalPaise - preview.totals.advanceReceivedPaise,
      0,
    ),
  };
}

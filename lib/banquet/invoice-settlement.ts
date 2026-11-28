import type { BanquetInvoiceDiscountType } from '../auth/types';

type InvoiceDiscount = { type: BanquetInvoiceDiscountType; value: number };

export function resolveInvoiceDiscount(
  settled: boolean,
  source: InvoiceDiscount | null,
  formType: BanquetInvoiceDiscountType,
  formValue: number,
): InvoiceDiscount | null {
  return settled ? source : { type: formType, value: formValue };
}

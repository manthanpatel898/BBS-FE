import {
  BanquetInvoiceDiscountType,
  IssueBanquetInvoicePayload,
} from '@/lib/auth/types';

export interface BanquetInvoiceIssueFormValues {
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  customerGstNumber: string;
  discountType: BanquetInvoiceDiscountType;
  discountValue: number;
}

export function buildBanquetInvoiceIssuePayload(
  values: BanquetInvoiceIssueFormValues,
): IssueBanquetInvoicePayload {
  const customerAddress = values.customerAddress.trim();
  const customerGstNumber = values.customerGstNumber.trim().toUpperCase();
  return {
    customerName: values.customerName.trim(),
    customerMobile: values.customerMobile.trim(),
    ...(customerAddress ? { customerAddress } : {}),
    ...(customerGstNumber ? { customerGstNumber } : {}),
    ...(values.discountType !== 'NONE'
      ? {
          discountType: values.discountType,
          discountValue: values.discountValue,
        }
      : {}),
  };
}

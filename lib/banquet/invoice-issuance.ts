import {
  BanquetInvoiceDiscountType,
  IssueBanquetInvoicePayload,
} from '@/lib/auth/types';

const GSTIN_PATTERN = /^[0-9]{2}[A-Z]{5}[0-9]{4}[A-Z][1-9A-Z]Z[0-9A-Z]$/;

export interface BanquetInvoiceIssueFormValues {
  customerName: string;
  customerMobile: string;
  customerAddress: string;
  customerState: string;
  customerCountry: string;
  customerGstNumber: string;
  discountType: BanquetInvoiceDiscountType;
  discountValue: number;
}

export function buildBanquetInvoiceIssuePayload(
  values: BanquetInvoiceIssueFormValues,
): IssueBanquetInvoicePayload {
  const customerAddress = values.customerAddress.trim();
  const customerGstNumber = values.customerGstNumber.trim().toUpperCase();
  const customerState = values.customerState.trim();
  const customerCountry = values.customerCountry.trim() || 'India';
  if (!values.customerName.trim()) throw new Error('Customer billing name is required.');
  if (customerGstNumber && !GSTIN_PATTERN.test(customerGstNumber)) {
    throw new Error('Enter a valid 15-character customer GSTIN.');
  }
  if (customerGstNumber && (!customerAddress || !customerState)) {
    throw new Error('Customer address and state are required when GSTIN is provided.');
  }
  return {
    customerName: values.customerName.trim(),
    ...(values.customerMobile.trim() ? { customerMobile: values.customerMobile.trim() } : {}),
    ...(customerAddress ? { customerAddress } : {}),
    ...(customerState ? { customerState } : {}),
    customerCountry,
    ...(customerGstNumber ? { customerGstNumber } : {}),
    ...(values.discountType !== 'NONE'
      ? {
          discountType: values.discountType,
          discountValue: values.discountValue,
        }
      : {}),
  };
}

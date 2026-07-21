import type { DecorationConfirmationPayload } from '@/lib/auth/types';

export type DecorationConfirmationForm = {
  advanceAmount: string;
  paymentDate: string;
  paymentMode: string;
  remark: string;
};

export function validateDecorationConfirmationForm(form: DecorationConfirmationForm, packageRate: number, totalCollected: number, isPackagePriceFinalized = true) {
  const errors: Partial<Record<keyof DecorationConfirmationForm, string>> = {};
  const amount = Number(form.advanceAmount);
  const outstanding = Math.max(0, packageRate - totalCollected);
  if (!form.advanceAmount.trim() || !Number.isFinite(amount)) errors.advanceAmount = 'Enter a valid advance amount';
  else if (amount < 0) errors.advanceAmount = 'Advance amount cannot be negative';
  else if (isPackagePriceFinalized && amount > outstanding) errors.advanceAmount = `Advance amount cannot exceed ₹${outstanding.toLocaleString('en-IN')}`;
  if (Number.isFinite(amount) && amount > 0) {
    if (!form.paymentDate) errors.paymentDate = 'Payment date is required';
    if (!form.paymentMode.trim()) errors.paymentMode = 'Payment mode is required';
  }
  return errors;
}

export function buildDecorationConfirmationPayload(form: DecorationConfirmationForm, requestId: string): DecorationConfirmationPayload {
  const advanceAmount = Number(form.advanceAmount);
  return {
    requestId,
    advanceAmount,
    ...(advanceAmount > 0 ? {
      paymentDate: form.paymentDate,
      paymentMode: form.paymentMode.trim(),
      ...(form.remark.trim() ? { remark: form.remark.trim() } : {}),
    } : {}),
  };
}

export function getDecorationConfirmationRequestId(current: string, generate: () => string) {
  return current || generate();
}

import type { DecorationPaymentPayload } from '@/lib/auth/types';

export type DecorationPaymentForm = {
  amount: string;
  date: string;
  mode: string;
  remark: string;
};

export type DecorationPaymentFormErrors = Partial<Record<keyof DecorationPaymentForm, string>>;

export function validateDecorationPaymentForm(form: DecorationPaymentForm, outstandingAmount: number): DecorationPaymentFormErrors {
  const errors: DecorationPaymentFormErrors = {};
  const amount = Number(form.amount);
  if (!form.amount.trim() || !Number.isFinite(amount)) errors.amount = 'Enter a valid amount.';
  else if (amount <= 0) errors.amount = 'Amount must be greater than zero.';
  else if (!/^\d+(?:\.\d{1,2})?$/.test(form.amount.trim())) errors.amount = 'Amount can have at most two decimal places.';
  else if (amount > outstandingAmount) errors.amount = 'Amount cannot exceed the outstanding balance.';
  if (!form.date) errors.date = 'Payment date is required.';
  if (!form.mode.trim()) errors.mode = 'Payment mode is required.';
  return errors;
}

export function buildDecorationPaymentPayload(form: DecorationPaymentForm): DecorationPaymentPayload {
  const remark = form.remark.trim();
  return {
    amount: Number(form.amount),
    date: form.date,
    mode: form.mode.trim(),
    ...(remark ? { remark } : {}),
  };
}

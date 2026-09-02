import type { OrderStatus } from '@/lib/auth/types';

export type QuotationActionEligibilityInput = {
  enabled: boolean;
  canManage: boolean;
  status: OrderStatus;
  inquiryClosed?: boolean;
  isPastEvent?: boolean;
};

export function canShowInquiryQuotationAction(input: QuotationActionEligibilityInput): boolean {
  return (
    input.enabled &&
    input.canManage &&
    input.status === 'INQUIRY' &&
    !input.inquiryClosed &&
    !input.isPastEvent
  );
}

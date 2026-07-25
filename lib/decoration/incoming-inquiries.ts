import type { PartnerInquiryStatus } from '@/lib/auth/types';

export const incomingInquiryStatuses: PartnerInquiryStatus[] = [
  'PENDING',
  'ACCEPTED',
  'DECLINED',
  'WITHDRAWN',
];

export function normalizeIncomingInquiryStatus(value: string | null): PartnerInquiryStatus {
  return incomingInquiryStatuses.includes(value as PartnerInquiryStatus)
    ? value as PartnerInquiryStatus
    : 'PENDING';
}

export function incomingInquiryUrl(status: PartnerInquiryStatus) {
  return status === 'PENDING'
    ? '/decoration/incoming-inquiries'
    : `/decoration/incoming-inquiries?status=${status}`;
}

export function canEnablePartnerSharing(input: {
  partnerCount: number;
  currentPolicyAccepted: boolean;
  acceptingCurrentPolicy: boolean;
}) {
  return (
    input.partnerCount > 0 &&
    (input.currentPolicyAccepted || input.acceptingCurrentPolicy)
  );
}


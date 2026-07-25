export const FOLLOW_UP_REASON_OPTIONS = [
  { value: 'BOOKED_ELSEWHERE', label: 'Booked somewhere else' },
  { value: 'EVENT_CANCELLED', label: 'Event cancelled' },
  { value: 'PRICE_TOO_HIGH', label: 'Price is too high' },
  { value: 'DATE_CHANGED', label: 'Date changed' },
  { value: 'VENUE_CHANGED', label: 'Venue changed' },
  { value: 'MENU_NOT_SUITABLE', label: 'Menu not suitable' },
  { value: 'CUSTOMER_NOT_RESPONDING', label: 'Customer not responding' },
  { value: 'DECISION_POSTPONED', label: 'Decision postponed' },
  {
    value: 'WAITING_FOR_FAMILY_APPROVAL',
    label: 'Waiting for family approval',
  },
  { value: 'COMPARING_OTHER_OPTIONS', label: 'Comparing other options' },
  { value: 'OTHER', label: 'Other' },
] as const;

export type FollowUpReason =
  (typeof FOLLOW_UP_REASON_OPTIONS)[number]['value'];

export function normalizeFollowUpReasonPayload(
  reason: FollowUpReason | '',
  customReason: string,
): { reason?: FollowUpReason; customReason?: string } {
  if (!reason) return {};
  if (reason !== 'OTHER') return { reason };

  const normalizedCustomReason = customReason.trim();
  return {
    reason,
    ...(normalizedCustomReason
      ? { customReason: normalizedCustomReason }
      : {}),
  };
}

export function getFollowUpReasonLabel(
  reason: FollowUpReason | null | undefined,
  customReason?: string | null,
) {
  if (!reason) return null;
  if (reason === 'OTHER') return customReason?.trim() || 'Other';
  return (
    FOLLOW_UP_REASON_OPTIONS.find((option) => option.value === reason)?.label ??
    reason
  );
}

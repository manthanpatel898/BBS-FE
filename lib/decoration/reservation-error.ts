const TRANSACTION_ERROR_PATTERN = /mongodb|replica[ -]?set|transaction/i;

export function decorationReservationErrorMessage(reason: unknown): string {
  const message = reason instanceof Error ? reason.message.trim() : '';
  if (TRANSACTION_ERROR_PATTERN.test(message)) {
    return 'Decoration selection is temporarily unavailable. Please contact the administrator.';
  }
  return message || 'Unable to save decoration selection. Your choices are retained.';
}

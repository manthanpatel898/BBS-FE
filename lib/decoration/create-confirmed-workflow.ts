import type {
  DecorationConfirmationPayload,
  DecorationConfirmationResult,
} from '@/lib/auth/types';

export type DecorationConfirmationDraft = {
  bookingPayload: Record<string, unknown>;
  requestId: string;
};

export function createDecorationConfirmationDraft(
  bookingPayload: Record<string, unknown>,
  generateRequestId: () => string,
): DecorationConfirmationDraft {
  return {
    bookingPayload: { ...bookingPayload },
    requestId: generateRequestId(),
  };
}

export function cancelDecorationConfirmationDraft(
  _draft: DecorationConfirmationDraft,
): null {
  return null;
}

export function submitDecorationConfirmationDraft(
  draft: DecorationConfirmationDraft,
  confirmation: Omit<DecorationConfirmationPayload, 'requestId'>,
  send: (
    payload: Record<string, unknown> & DecorationConfirmationPayload,
  ) => Promise<DecorationConfirmationResult>,
) {
  return send({
    ...draft.bookingPayload,
    ...confirmation,
    requestId: draft.requestId,
  });
}

import test from 'node:test';
import assert from 'node:assert/strict';
import {
  cancelDecorationConfirmationDraft,
  createDecorationConfirmationDraft,
  submitDecorationConfirmationDraft,
} from './create-confirmed-workflow.ts';

const bookingPayload = {
  customerName: 'Manthan Patel',
  mobile: '9876543210',
  eventTypeId: 'event-1',
  venueId: 'venue-1',
  timeSlot: 'MORNING',
  startDate: '2026-08-20',
};

test('cancel clears the pending confirmation without invoking the create API', async () => {
  let calls = 0;
  const draft = createDecorationConfirmationDraft(
    bookingPayload,
    () => '8ac3b75a-6a6d-41df-a15d-6aa0e5f00c2c',
  );
  const cancelled = cancelDecorationConfirmationDraft(draft);
  assert.equal(cancelled, null);
  assert.equal(calls, 0);
  assert.equal(typeof submitDecorationConfirmationDraft, 'function');
});

test('retrying a pending confirmation reuses the same request id', async () => {
  const sent = [];
  const draft = createDecorationConfirmationDraft(
    bookingPayload,
    () => '8ac3b75a-6a6d-41df-a15d-6aa0e5f00c2c',
  );
  const send = async (payload) => {
    sent.push(payload);
    return { booking: { id: 'booking-1' }, reused: sent.length > 1 };
  };
  const advance = { advanceAmount: 0 };
  await submitDecorationConfirmationDraft(draft, advance, send);
  await submitDecorationConfirmationDraft(draft, advance, send);
  assert.equal(sent.length, 2);
  assert.equal(sent[0].requestId, draft.requestId);
  assert.equal(sent[1].requestId, draft.requestId);
});

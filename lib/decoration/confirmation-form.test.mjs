import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecorationConfirmationPayload, getDecorationConfirmationRequestId, validateDecorationConfirmationForm } from './confirmation-form.ts';

const base = { advanceAmount: '0', paymentDate: '', paymentMode: '', remark: '' };

test('allows confirmation with zero advance and no payment-only fields', () => {
  assert.deepEqual(validateDecorationConfirmationForm(base, 6000, 0), {});
  assert.deepEqual(buildDecorationConfirmationPayload(base, 'request-1'), { requestId: 'request-1', advanceAmount: 0 });
});

test('requires payment date and mode for a positive advance', () => {
  assert.deepEqual(validateDecorationConfirmationForm({ ...base, advanceAmount: '1000' }, 6000, 0), {
    paymentDate: 'Payment date is required',
    paymentMode: 'Payment mode is required',
  });
});

test('rejects negative, malformed, and over-outstanding advances', () => {
  assert.equal(validateDecorationConfirmationForm({ ...base, advanceAmount: '-1' }, 6000, 0).advanceAmount, 'Advance amount cannot be negative');
  assert.equal(validateDecorationConfirmationForm({ ...base, advanceAmount: 'abc' }, 6000, 0).advanceAmount, 'Enter a valid advance amount');
  assert.equal(validateDecorationConfirmationForm({ ...base, advanceAmount: '5001' }, 6000, 1000).advanceAmount, 'Advance amount cannot exceed ₹5,000');
});

test('keeps one request id across retries and generates a new id for a new opening', () => {
  let generated = 0;
  const generate = () => `request-${++generated}`;
  const first = getDecorationConfirmationRequestId('', generate);
  assert.equal(getDecorationConfirmationRequestId(first, generate), first);
  assert.equal(getDecorationConfirmationRequestId('', generate), 'request-2');
});

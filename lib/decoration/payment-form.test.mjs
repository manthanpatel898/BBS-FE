import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecorationPaymentPayload, validateDecorationPaymentForm } from './payment-form.ts';

const valid = { amount: '2500.50', date: '2026-07-17', mode: ' UPI ', remark: ' Ref 42 ' };

test('builds a normalized decoration payment payload', () => {
  assert.deepEqual(buildDecorationPaymentPayload(valid), {
    amount: 2500.5,
    date: '2026-07-17',
    mode: 'UPI',
    remark: 'Ref 42',
  });
});

test('omits an empty optional remark', () => {
  assert.deepEqual(buildDecorationPaymentPayload({ ...valid, remark: ' ' }), {
    amount: 2500.5,
    date: '2026-07-17',
    mode: 'UPI',
  });
});

test('rejects missing, malformed, nonpositive, over-precision, and excessive amounts', () => {
  assert.match(validateDecorationPaymentForm({ ...valid, amount: '' }, 5000).amount, /valid amount/i);
  assert.match(validateDecorationPaymentForm({ ...valid, amount: 'abc' }, 5000).amount, /valid amount/i);
  assert.match(validateDecorationPaymentForm({ ...valid, amount: '0' }, 5000).amount, /greater than zero/i);
  assert.match(validateDecorationPaymentForm({ ...valid, amount: '1.234' }, 5000).amount, /two decimal/i);
  assert.match(validateDecorationPaymentForm({ ...valid, amount: '5000.01' }, 5000).amount, /outstanding/i);
});

test('requires payment date and mode', () => {
  assert.match(validateDecorationPaymentForm({ ...valid, date: '' }, 5000).date, /required/i);
  assert.match(validateDecorationPaymentForm({ ...valid, mode: ' ' }, 5000).mode, /required/i);
});

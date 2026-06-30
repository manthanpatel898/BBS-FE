import * as assert from 'node:assert/strict';
import { getAdvancePaymentSplit } from '../lib/advance-payment-split';

const split = getAdvancePaymentSplit(1000, 600, 4, 400, 6);

assert.equal(split.totalPayments, 10);
assert.equal(split.cashPercent, 60);
assert.equal(split.onlinePercent, 40);
assert.equal(split.cashBarPercent, 60);
assert.equal(split.onlineBarPercent, 40);

const emptySplit = getAdvancePaymentSplit(0, 0, 0, 0, 0);

assert.equal(emptySplit.totalPayments, 0);
assert.equal(emptySplit.cashPercent, 0);
assert.equal(emptySplit.onlinePercent, 0);
assert.equal(emptySplit.cashBarPercent, 0);
assert.equal(emptySplit.onlineBarPercent, 0);

const amountFallbackSplit = getAdvancePaymentSplit(0, 300, 1, 700, 1);

assert.equal(amountFallbackSplit.cashPercent, 30);
assert.equal(amountFallbackSplit.onlinePercent, 70);
assert.equal(amountFallbackSplit.cashBarPercent, 30);
assert.equal(amountFallbackSplit.onlineBarPercent, 70);

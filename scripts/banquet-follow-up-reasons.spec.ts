import { strict as assert } from 'node:assert';
import {
  FOLLOW_UP_REASON_OPTIONS,
  normalizeFollowUpReasonPayload,
} from '../lib/banquet/follow-up-reasons';

assert.equal(FOLLOW_UP_REASON_OPTIONS.length, 11);
assert.deepEqual(
  normalizeFollowUpReasonPayload('PRICE_TOO_HIGH', 'ignored'),
  { reason: 'PRICE_TOO_HIGH' },
);
assert.deepEqual(
  normalizeFollowUpReasonPayload('OTHER', '  Religious date changed  '),
  { reason: 'OTHER', customReason: 'Religious date changed' },
);
assert.deepEqual(normalizeFollowUpReasonPayload('', ''), {});

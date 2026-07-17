import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecorationFollowupPayload, validateDecorationFollowupForm } from './followup-form.ts';
const valid = { date: '2026-07-17', nextDate: '2026-07-20', note: ' Call customer ' };
test('normalizes follow-up payload', () => assert.deepEqual(buildDecorationFollowupPayload(valid), { date: '2026-07-17', nextDate: '2026-07-20', note: 'Call customer' }));
test('requires date and note and rejects next date before recorded date', () => {
  assert.match(validateDecorationFollowupForm({ ...valid, date: '' }).date, /required/i);
  assert.match(validateDecorationFollowupForm({ ...valid, note: ' ' }).note, /required/i);
  assert.match(validateDecorationFollowupForm({ ...valid, nextDate: '2026-07-16' }).nextDate, /on or after/i);
});

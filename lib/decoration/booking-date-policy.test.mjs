import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canCreateDecorationInquiry,
  decorationBusinessDate,
} from './booking-date-policy.ts';

test('uses Asia/Kolkata when UTC is still on the previous day', () => {
  assert.equal(
    decorationBusinessDate(new Date('2026-07-17T20:00:00.000Z')),
    '2026-07-18',
  );
});

test('allows today and future dates but rejects yesterday', () => {
  assert.equal(canCreateDecorationInquiry('2026-07-17', '2026-07-18'), false);
  assert.equal(canCreateDecorationInquiry('2026-07-18', '2026-07-18'), true);
  assert.equal(canCreateDecorationInquiry('2026-07-19', '2026-07-18'), true);
});

test('rejects malformed date values', () => {
  assert.equal(canCreateDecorationInquiry('', '2026-07-18'), false);
  assert.equal(canCreateDecorationInquiry('18/07/2026', '2026-07-18'), false);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { formatDecorationTime, formatDecorationTimeRange } from './time-format.ts';

test('formats decoration times in 12-hour format without changing stored values', () => {
  assert.equal(formatDecorationTime('00:00'), '12:00 AM');
  assert.equal(formatDecorationTime('12:15'), '12:15 PM');
  assert.equal(formatDecorationTime('18:45'), '6:45 PM');
  assert.equal(formatDecorationTimeRange('09:00', '17:30'), '9:00 AM – 5:30 PM');
  assert.equal(formatDecorationTime('legacy'), 'legacy');
});

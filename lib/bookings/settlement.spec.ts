import assert from 'node:assert/strict';
import test from 'node:test';
import { canSettleBooking } from './settlement';
test('settlement requires a live banquet entitlement and confirmed/completed past event', () => {
  const base = { businessType: 'BANQUET', enabled: true, status: 'CONFIRMED', eventDate: '2026-11-26', today: '2026-11-27' };
  assert.equal(canSettleBooking(base), true);
  assert.equal(canSettleBooking({ ...base, status: 'COMPLETED' }), true);
  for (const patch of [{ enabled: false }, { businessType: 'ODC' }, { status: 'INQUIRY' }, { status: 'CANCELLED' }, { eventDate: '2026-11-27' }, { eventDate: 'invalid' }]) assert.equal(canSettleBooking({ ...base, ...patch }), false);
});

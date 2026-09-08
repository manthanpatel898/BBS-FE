import { strict as assert } from 'node:assert';
import { getBookingServiceSlotOptions, buildDayHallSlotMatrix } from './service-slots';
assert.deepEqual(getBookingServiceSlotOptions(false), ['Breakfast', 'Lunch', 'Dinner']);
assert.deepEqual(getBookingServiceSlotOptions(true), ['Breakfast', 'Lunch', 'Dinner', 'Full Day']);
assert.ok(getBookingServiceSlotOptions(false, 'Full Day').includes('Full Day'));
for (const status of ['CONFIRMED', 'COMPLETED', 'INQUIRY', 'CANCELLED']) {
  const matrix = buildDayHallSlotMatrix([{ serviceSlot: 'Full Day', hallDetails: 'Hall A + Hall B', status }], ['Hall A', 'Hall B', 'Hall C']);
  for (const hall of ['Hall A', 'Hall B']) {
    for (const slot of ['Breakfast', 'Lunch', 'Dinner']) {
      assert.equal(matrix.cellMap.get(`${hall}::${slot}`), ['CONFIRMED', 'COMPLETED'].includes(status) ? 'full-day' : undefined);
    }
  }
  assert.equal(matrix.cellMap.get('Hall C::Lunch'), undefined);
}
console.log('Full day selection and hall matrix tests passed');

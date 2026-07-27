import test from 'node:test';
import assert from 'node:assert/strict';
import { applyDecorationAvailability } from './availability.ts';

const item = (id, availableQuantity) => ({ id, availableQuantity });

test('overlays booking-specific inventory without dropping catalog items', () => {
  const catalog = [item('a', 10), item('b', 3)];
  const result = applyDecorationAvailability(catalog, { calculatedAt: '2026-07-20T00:00:00.000Z', items: [{ itemId: 'a', totalQuantity: 10, serviceableQuantity: 8, maintenanceQuantity: 2, reservedQuantity: 8, availableQuantity: 0 }] });
  assert.equal(result[0].availableQuantity, 0);
  assert.equal(result[0].reservedQuantity, 8);
  assert.equal(result[0].totalQuantity, 10);
  assert.equal(result[1].availableQuantity, 3);
  assert.equal(catalog[0].availableQuantity, 10);
});

test('keeps catalog availability when live response is unavailable', () => {
  assert.equal(applyDecorationAvailability([item('a', 4)])[0].availableQuantity, 4);
});

import assert from 'node:assert/strict';
import test from 'node:test';
import { inventoryShortage } from './inventory-shortage.ts';

test('returns no warning when requested quantity is available', () => {
  assert.equal(inventoryShortage(2, 2), null);
});

test('returns professional shortage copy without blocking selection', () => {
  assert.deepEqual(inventoryShortage(5, 2), {
    shortageQuantity: 3,
    message:
      'Only 2 of 5 units are available for this event time. Arrange or rent 3 additional units.',
  });
});

test('uses singular unit copy', () => {
  assert.equal(
    inventoryShortage(2, 1)?.message,
    'Only 1 of 2 units is available for this event time. Arrange or rent 1 additional unit.',
  );
});

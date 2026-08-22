import assert from 'node:assert/strict';
import test from 'node:test';
import {
  addMinutesToTime,
  availableCategoryIds,
  combinedPackageTotal,
  packageSubtotal,
} from './additional-category-selection';

test('additional package end time defaults to 90 minutes after its start time', () => {
  assert.equal(addMinutesToTime('08:00', 90), '09:30');
  assert.equal(addMinutesToTime('23:30', 90), '01:00');
  assert.equal(addMinutesToTime('', 90), '');
});

test('available categories exclude the primary and other selected packages', () => {
  assert.deepEqual(
    availableCategoryIds(
      [{ id: 'primary' }, { id: 'breakfast' }, { id: 'dinner' }],
      'primary',
      [{ categoryId: 'breakfast' }],
    ),
    ['dinner'],
  );
});

test('package subtotal uses an explicit custom price, including zero', () => {
  assert.equal(
    packageSubtotal({ pax: '60', configuredPrice: 400, customPrice: '' }),
    24000,
  );
  assert.equal(
    packageSubtotal({ pax: '60', configuredPrice: 400, customPrice: '0' }),
    0,
  );
});

test('combined total includes the primary and every additional package', () => {
  assert.equal(
    combinedPackageTotal(
      { pax: '120', configuredPrice: 799, customPrice: '' },
      [{ pax: '60', configuredPrice: 400, customPrice: '' }],
    ),
    119880,
  );
});

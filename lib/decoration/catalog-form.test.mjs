import test from 'node:test';
import assert from 'node:assert/strict';
import { buildDecorationItemPayload, validateDecorationCategoryForm, validateDecorationItemForm } from './catalog-form.ts';

const base = { categoryId: 'cat-1', name: ' Royal Sofa ', description: '', trackingMode: 'BULK', totalQuantity: '10', maintenanceQuantity: '2', units: '', logisticsMode: 'SETUP_REMOVAL', setupBufferMinutes: '60', removalBufferMinutes: '30', turnaroundBufferMinutes: '0', storageNote: '' };

test('requires a normalized category name', () => {
  assert.deepEqual(validateDecorationCategoryForm({ name: ' ', description: '' }), { name: 'Decoration type is required.' });
});

test('validates bulk inventory and nonnegative logistics buffers', () => {
  assert.match(validateDecorationItemForm({ ...base, maintenanceQuantity: '11' }).maintenanceQuantity, /cannot exceed/i);
  assert.match(validateDecorationItemForm({ ...base, setupBufferMinutes: '-1' }).setupBufferMinutes, /zero or greater/i);
});

test('requires tagged units with unique codes matching total quantity', () => {
  const tagged = { ...base, trackingMode: 'TAGGED', totalQuantity: '2', maintenanceQuantity: '0', units: 'SF-01|AVAILABLE\nSF-01|MAINTENANCE' };
  assert.match(validateDecorationItemForm(tagged).units, /unique/i);
  assert.deepEqual(validateDecorationItemForm({ ...tagged, units: 'SF-01|AVAILABLE\nSF-02|MAINTENANCE' }), {});
});

test('builds a trimmed API payload', () => {
  assert.deepEqual(buildDecorationItemPayload(base), {
    categoryId: 'cat-1', name: 'Royal Sofa', trackingMode: 'BULK', totalQuantity: 10, maintenanceQuantity: 2, units: [], logisticsMode: 'SETUP_REMOVAL', setupBufferMinutes: 60, removalBufferMinutes: 30, turnaroundBufferMinutes: 0,
  });
});

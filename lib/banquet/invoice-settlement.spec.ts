import assert from 'node:assert/strict';
import test from 'node:test';
import { resolveInvoiceDiscount } from './invoice-settlement';
test('settled issuance uses the canonical preview discount despite local overrides', () => {
  const canonical = { type: 'FIXED' as const, value: 125025 };
  assert.deepEqual(resolveInvoiceDiscount(true, canonical, 'NONE', 0), canonical);
  assert.deepEqual(resolveInvoiceDiscount(true, canonical, 'PERCENTAGE', 1000), canonical);
  assert.deepEqual(resolveInvoiceDiscount(false, canonical, 'PERCENTAGE', 1000), { type: 'PERCENTAGE', value: 1000 });
  assert.equal(resolveInvoiceDiscount(true, null, 'NONE', 0), null);
});

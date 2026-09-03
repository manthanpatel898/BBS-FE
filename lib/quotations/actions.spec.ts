import assert from 'node:assert/strict';
import test from 'node:test';
import {
  canAcceptQuotation,
  canCancelQuotation,
  canConfirmFromQuotation,
  nextQuotationSelection,
} from './actions';
import type { BanquetQuotation } from './types';

function quotation(version: number, status: BanquetQuotation['status']): BanquetQuotation {
  return {
    id: `quotation-${version}-${status}`,
    quotationNumber: `QT-${version}`,
    version,
    status,
    validUntil: '2026-09-20T00:00:00.000Z',
    generatedAt: '2026-09-02T00:00:00.000Z',
    customerSnapshot: {},
    eventSnapshot: {},
    packages: [],
    addOns: [],
    tax: {},
    totals: {},
  };
}

test('only generated quotations can be accepted', () => {
  assert.equal(canAcceptQuotation(quotation(1, 'GENERATED')), true);
  assert.equal(canAcceptQuotation(quotation(1, 'ACCEPTED')), false);
  assert.equal(canAcceptQuotation(quotation(1, 'SUPERSEDED')), false);
  assert.equal(canAcceptQuotation(quotation(1, 'CANCELLED')), false);
});

test('generated and accepted quotations can be cancelled', () => {
  assert.equal(canCancelQuotation(quotation(1, 'GENERATED')), true);
  assert.equal(canCancelQuotation(quotation(1, 'ACCEPTED')), true);
  assert.equal(canCancelQuotation(quotation(1, 'SUPERSEDED')), false);
  assert.equal(canCancelQuotation(quotation(1, 'CANCELLED')), false);
});

test('only accepted quotations can confirm a booking', () => {
  assert.equal(canConfirmFromQuotation(quotation(1, 'GENERATED')), false);
  assert.equal(canConfirmFromQuotation(quotation(1, 'ACCEPTED')), true);
  assert.equal(canConfirmFromQuotation(quotation(1, 'SUPERSEDED')), false);
  assert.equal(canConfirmFromQuotation(quotation(1, 'CANCELLED')), false);
});

test('keeps the current selection when it is still available after refresh', () => {
  const current = quotation(1, 'ACCEPTED');
  assert.equal(nextQuotationSelection([quotation(2, 'GENERATED'), current], current.id)?.id, current.id);
});

test('falls back to newest reusable quotation when selected quotation is unavailable', () => {
  const selected = nextQuotationSelection(
    [quotation(3, 'CANCELLED'), quotation(2, 'ACCEPTED'), quotation(1, 'GENERATED')],
    'missing',
  );

  assert.equal(selected?.id, 'quotation-2-ACCEPTED');
});

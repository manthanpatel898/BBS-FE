import assert from 'node:assert/strict';
import test from 'node:test';
import type { Order } from '@/lib/auth/types';
import type { BanquetQuotation } from './types';
import { quotationToPrintableOrder } from './print-adapter';

test('maps quotation snapshot to order-like print structure', () => {
  const order = {
    id: 'order-1',
    status: 'INQUIRY',
    menuSelectionSnapshot: [],
    additionalCategorySelections: [],
    addonServiceSnapshots: [],
    advancePayments: [],
  } as unknown as Order;
  const quotation = {
    id: 'q1',
    packages: [{
      packageType: 'PRIMARY',
      categoryId: 'cat1',
      categoryName: 'Veloura',
      pax: 100,
      configuredRatePaise: 85000,
      customRatePaise: null,
      effectiveRatePaise: 85000,
      subtotalPaise: 8500000,
      menuSelections: [{ menuId: 'm1', title: 'Mocktail', sections: [{ sectionTitle: 'Mocktail', items: ['Blue Lagoon'] }] }],
      menuComment: 'Serve chilled',
    }],
    addOns: [{ id: null, label: 'Projector', amountPaise: 150000 }],
    totals: { grandTotalPaise: 8650000 },
  } as unknown as BanquetQuotation;

  const printable = quotationToPrintableOrder(order, quotation);

  assert.equal(printable.status, 'CONFIRMED');
  assert.equal(printable.categorySnapshot?.name, 'Veloura');
  assert.equal(printable.menuSelectionSnapshot[0]?.sections[0]?.items[0], 'Blue Lagoon');
  assert.equal(printable.addonServiceSnapshots[0]?.price, 1500);
  assert.equal(printable.advancePayments.length, 0);
});

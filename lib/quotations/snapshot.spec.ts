import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getLatestReusableQuotation,
  quotationToSelectionSnapshot,
} from './snapshot';
import type { BanquetQuotation } from './types';

function quotation(version: number, status: BanquetQuotation['status']): BanquetQuotation {
  return {
    id: `q-${version}`,
    quotationNumber: 'QT-2026-0001',
    version,
    status,
    validUntil: '2026-09-20T00:00:00.000Z',
    generatedAt: '2026-09-02T00:00:00.000Z',
    customerSnapshot: {},
    eventSnapshot: {},
    packages: [
      {
        packageType: 'PRIMARY',
        label: 'Primary package',
        categoryId: 'cat-main',
        categoryName: 'Lunch',
        pax: 100,
        configuredRatePaise: 80000,
        customRatePaise: 85000,
        effectiveRatePaise: 85000,
        subtotalPaise: 8500000,
        serviceSlot: 'Lunch',
        startTime: '11:00',
        endTime: '15:00',
        menuSelections: [
          {
            menuId: 'menu-1',
            title: 'Starter',
            directItems: [],
            sections: [{ sectionTitle: 'Starter', items: ['Paneer Tikka'] }],
          },
        ],
        menuComment: 'No onion',
      },
      {
        packageType: 'ADDITIONAL',
        label: 'Additional package 1',
        categoryId: 'cat-breakfast',
        categoryName: 'Breakfast',
        pax: 40,
        configuredRatePaise: 30000,
        customRatePaise: null,
        effectiveRatePaise: 30000,
        subtotalPaise: 1200000,
        serviceSlot: '',
        startTime: '08:00',
        endTime: '09:30',
        menuSelections: [],
        menuComment: '',
      },
    ],
    addOns: [{ id: 'addon-1', label: 'Projector', amountPaise: 150000 }],
    tax: {},
    totals: {},
  };
}

test('selects latest generated or accepted quotation and ignores cancelled versions', () => {
  assert.equal(
    getLatestReusableQuotation([
      quotation(3, 'CANCELLED'),
      quotation(1, 'GENERATED'),
      quotation(2, 'ACCEPTED'),
    ])?.version,
    2,
  );
});

test('maps quotation package snapshots back to booking selector state', () => {
  const snapshot = quotationToSelectionSnapshot(quotation(2, 'ACCEPTED'));

  assert.equal(snapshot.primary?.categoryId, 'cat-main');
  assert.equal(snapshot.primary?.totalPerson, '100');
  assert.equal(snapshot.primary?.customPricePerPlate, '850');
  assert.equal(snapshot.primary?.selectedMenus[0]?.sections[0]?.items[0], 'Paneer Tikka');
  assert.equal(snapshot.primary?.menuComment, 'No onion');
  assert.equal(snapshot.additional[0]?.categoryId, 'cat-breakfast');
  assert.equal(snapshot.additional[0]?.pax, '40');
  assert.equal(snapshot.addonEntries[0]?.price, '1500');
});

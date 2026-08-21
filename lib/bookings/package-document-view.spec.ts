import assert from 'node:assert/strict';
import test from 'node:test';
import { buildPackageDocumentSections } from './package-document-view';

test('document packages keep primary first and sort additional packages', () => {
  const sections = buildPackageDocumentSections({
    pax: 120,
    serviceSlot: 'Lunch',
    startTime: '11:00',
    endTime: '15:00',
    pricePerPlate: 799,
    baseTotal: 95880,
    categorySnapshot: { categoryId: 'lunch', name: 'Lunch', pricePerPlate: 799, description: null },
    menuSelectionSnapshot: [{ menuId: 'main', title: 'Main', sections: [] }],
    menuComment: 'Primary note',
    additionalCategorySelections: [
      {
        selectionId: 'dinner-id', categoryId: 'dinner', categorySnapshot: { categoryId: 'dinner', name: 'Dinner', pricePerPlate: 500, description: null },
        pax: 80, configuredPricePerPlate: 500, customPricePerPlate: null,
        effectivePricePerPlate: 500, serviceSlot: 'Dinner', startTime: '19:00', endTime: '23:00',
        menuSelectionSnapshot: [], menuComment: null, subtotal: 40000, displayOrder: 1,
      },
      {
        selectionId: 'breakfast-id', categoryId: 'breakfast', categorySnapshot: { categoryId: 'breakfast', name: 'Breakfast', pricePerPlate: 400, description: null },
        pax: 60, configuredPricePerPlate: 400, customPricePerPlate: null,
        effectivePricePerPlate: 400, serviceSlot: 'Breakfast', startTime: '08:00', endTime: '10:00',
        menuSelectionSnapshot: [], menuComment: 'Less spicy', subtotal: 24000, displayOrder: 0,
      },
    ],
  });

  assert.deepEqual(sections.map((section) => section.categoryName), ['Lunch', 'Breakfast', 'Dinner']);
  assert.equal(sections[1]?.time, '8:00 AM - 10:00 AM');
  assert.equal(sections[1]?.comment, 'Less spicy');
  assert.equal(sections[1]?.subtotal, 24000);
});

test('legacy primary-only booking remains a single document package', () => {
  const sections = buildPackageDocumentSections({
    pax: 100,
    serviceSlot: 'Lunch',
    startTime: '11:00',
    endTime: '15:00',
    pricePerPlate: 700,
    baseTotal: 70000,
    categorySnapshot: { categoryId: 'lunch', name: 'Lunch', pricePerPlate: 700, description: null },
    menuSelectionSnapshot: [],
    menuComment: null,
  });
  assert.equal(sections.length, 1);
  assert.equal(sections[0]?.kind, 'PRIMARY');
});

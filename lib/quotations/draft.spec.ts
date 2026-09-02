import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQuotationDraftPayload } from './draft';

test('builds quotation draft payload from booking package selections', () => {
  const payload = buildQuotationDraftPayload({
    categoryId: 'cat-primary',
    pax: '100',
    customPricePerPlate: '850',
    selectedMenus: [
      {
        menuId: 'menu-1',
        title: 'Starter',
        directItems: ['Paneer Tikka'],
        sections: [{ sectionTitle: 'Farsan', items: ['Dhokla'] }],
      },
    ],
    menuComment: ' No onion ',
    addonEntries: [{ label: 'Projector', price: '1500' }],
    additionalCategorySelections: [
      {
        uiId: 'additional-1',
        categoryId: 'cat-breakfast',
        pax: '40',
        configuredPricePerPlate: 300,
        customPricePerPlate: '',
        startTime: '08:00',
        endTime: '09:30',
        selectedMenus: [],
        menuComment: '',
      },
    ],
    settings: {
      enableInquiryQuotations: true,
      validityDays: 10,
      taxTreatment: 'ADD_CONFIGURED_GST',
      gstPercentage: 5,
      terms: 'Terms',
      paymentTerms: 'Payment',
      cancellationPolicy: 'Cancel',
      footer: 'Footer',
    },
  });

  assert.equal(payload.categoryId, 'cat-primary');
  assert.equal(payload.pax, 100);
  assert.equal(payload.customPricePerPlate, 850);
  assert.equal(payload.menuComment, 'No onion');
  assert.equal(payload.additionalPackages?.[0]?.categoryId, 'cat-breakfast');
  assert.equal(payload.additionalPackages?.[0]?.pax, 40);
  assert.deepEqual(payload.addonServices, [{ id: undefined, label: 'Projector', price: 1500 }]);
  assert.equal(payload.taxTreatment, 'ADD_CONFIGURED_GST');
});

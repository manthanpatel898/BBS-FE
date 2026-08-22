import assert from 'node:assert/strict';
import test from 'node:test';
import { buildMenuSelectionUpdatePayload } from './menu-selection-update';

test('menu selection update contains only fields owned by the menu workflow', () => {
  const payload = buildMenuSelectionUpdatePayload({
    categoryId: 'category-1',
    selectedMenus: [
      {
        menuId: 'menu-1',
        title: 'Mocktail',
        directItems: [],
        sections: [{ sectionTitle: 'MOCKTAIL', items: ['Berry Cooler'] }],
      },
    ],
    menuComment: ' No ice ',
    addonEntries: [{ id: 'addon-1', label: 'Live counter', price: '2500' }],
    customPricePerPlate: ' 899 ',
    welcomeDrinkStartTime: '19:15',
    mainCourseStartTime: '',
    enableWelcomeDrinkStartTime: true,
    enableMainCourseStartTime: true,
    additionalCategorySelections: [
      {
        uiId: 'ui-selection-1',
        selectionId: 'saved-selection-1',
        categoryId: 'breakfast-category',
        pax: '60',
        configuredPricePerPlate: 400,
        customPricePerPlate: '',
        startTime: '08:00',
        endTime: '10:00',
        selectedMenus: [
          {
            menuId: 'breakfast-menu',
            title: 'Breakfast',
            sections: [
              { sectionTitle: 'Breakfast', items: ['Poha'] },
            ],
          },
        ],
        menuComment: ' Less spicy ',
      },
    ],
    menuSelectionTracking: {
      startedAt: '2026-08-19T12:59:12.050Z',
      trigger: 'change',
    },
  });

  assert.deepEqual(payload, {
    categoryId: 'category-1',
    addonServices: [{ id: 'addon-1', label: 'Live counter', price: 2500 }],
    customPricePerPlate: 899,
    selectedMenus: [
      {
        menuId: 'menu-1',
        directItems: [],
        sections: [{ sectionTitle: 'MOCKTAIL', items: ['Berry Cooler'] }],
      },
    ],
    menuComment: 'No ice',
    welcomeDrinkStartTime: '19:15',
    mainCourseStartTime: null,
    additionalCategorySelections: [
      {
        selectionId: 'saved-selection-1',
        categoryId: 'breakfast-category',
        pax: 60,
        customPricePerPlate: null,
        startTime: '08:00',
        endTime: '10:00',
        selectedMenus: [
          {
            menuId: 'breakfast-menu',
            directItems: [],
            sections: [{ sectionTitle: 'Breakfast', items: ['Poha'] }],
          },
        ],
        menuComment: 'Less spicy',
        displayOrder: 0,
      },
    ],
    menuSelectionTracking: {
      startedAt: '2026-08-19T12:59:12.050Z',
      trigger: 'change',
    },
  });

  assert.equal('eventType' in payload, false);
  assert.equal('functionName' in payload, false);
  assert.equal('status' in payload, false);
  assert.equal('advanceAmount' in payload, false);
  assert.equal('customer' in payload, false);
});

test('menu selection update supports structured and flexible menu shapes', () => {
  const payload = buildMenuSelectionUpdatePayload({
    categoryId: 'category-1',
    selectedMenus: [
      {
        menuId: 'menu-flexible',
        title: 'Starter / Farsan',
        directItems: ['Welcome platter'],
        sections: [{ sectionTitle: 'Starter', items: ['Paneer tikka'] }],
      },
    ],
    menuComment: '',
    addonEntries: [],
    customPricePerPlate: '',
    welcomeDrinkStartTime: '',
    mainCourseStartTime: '',
    enableWelcomeDrinkStartTime: false,
    enableMainCourseStartTime: false,
    additionalCategorySelections: [],
  });

  assert.deepEqual(payload.selectedMenus, [
    {
      menuId: 'menu-flexible',
      directItems: ['Welcome platter'],
      sections: [{ sectionTitle: 'Starter', items: ['Paneer tikka'] }],
    },
  ]);
  assert.equal('addonServices' in payload, false);
  assert.equal('customPricePerPlate' in payload, false);
  assert.equal('welcomeDrinkStartTime' in payload, false);
  assert.equal('mainCourseStartTime' in payload, false);
});

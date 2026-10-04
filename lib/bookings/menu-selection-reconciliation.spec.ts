import assert from 'node:assert/strict';
import { test } from 'node:test';
import {
  reconcileMenuSelections,
  reconcileMenuPackage,
  resolveReviewedItem,
  keepPendingMenuSelections,
  reconcileLoadedMenuSelections,
} from './menu-selection-reconciliation';

const category = {
  menuRules: [],
  flexibleChoiceGroups: [
    {
      groupId: 'drink',
      menuId: 'new-drink',
      menuTitle: 'Welcome Drink',
      includedChoices: 1,
      allowedDirectItems: ['PEACH MINT MOJITO', 'BLUE LAGOON'],
      submenuRules: [],
    },
  ],
};
const old = {
  menuId: 'old-drink',
  title: 'Welcome Drink',
  directItems: ['PEACH MINT MOJITO'],
  sections: [],
};

test('restores old IDs into a unique current group and merges duplicate selections without changing the snapshot', () => {
  const saved = [old, { ...old, menuId: 'new-drink' }];
  const before = JSON.stringify(saved);
  const result = reconcileMenuSelections(saved, category);
  assert.equal(result.pending.length, 0);
  assert.deepEqual(result.selections, [
    {
      menuId: 'new-drink',
      title: 'Welcome Drink',
      directItems: ['PEACH MINT MOJITO'],
      sections: [],
    },
  ]);
  assert.equal(JSON.stringify(saved), before);
  assert.deepEqual(
    reconcileMenuSelections(result.selections, category),
    result,
  );
});

test('does not guess by item name when titles differ or multiple groups match', () => {
  assert.equal(
    reconcileMenuSelections([{ ...old, title: 'Other drink' }], category)
      .pending.length,
    1,
  );
  const ambiguous = {
    ...category,
    flexibleChoiceGroups: [
      ...category.flexibleChoiceGroups,
      { ...category.flexibleChoiceGroups[0], menuId: 'another' },
    ],
  };
  assert.equal(reconcileMenuSelections([old], ambiguous).pending.length, 1);
});

test('keeps missing items visible and requires explicit removal or replacement', () => {
  const result = reconcileMenuSelections(
    [{ ...old, directItems: ['REMOVED DRINK'] }],
    category,
  );
  assert.equal(result.pending[0].item, 'REMOVED DRINK');
  assert.equal(result.selections[0].menuId, 'old-drink');
  assert.deepEqual(
    resolveReviewedItem(result.selections, result.pending[0], null),
    [],
  );
  const replaced = resolveReviewedItem(
    result.selections,
    result.pending[0],
    result.options[1],
  );
  assert.deepEqual(replaced[0].directItems, ['BLUE LAGOON']);
  assert.equal(reconcileMenuSelections(replaced, category).pending.length, 0);
});

test('preserves existing addons only at an unchanged valid destination', () => {
  const addon = { ...old, menuId: 'new-drink', directItems: ['CUSTOM DRINK'] };
  assert.equal(reconcileMenuSelections([addon], category).pending.length, 0);
  assert.equal(
    reconcileMenuSelections([{ ...addon, menuId: 'old-drink' }], category)
      .pending.length,
    1,
  );
});

test('standard sections remap only by matching title, section, and item', () => {
  const standard = {
    menuRules: [
      {
        menuId: 'new-food',
        menuTitle: 'Food',
        sectionTitle: 'Rice',
        allowedItems: ['JEERA RICE'],
      },
    ],
  };
  const saved = [
    {
      menuId: 'old-food',
      title: 'Food',
      sections: [{ sectionTitle: 'Rice', items: ['JEERA RICE', 'REMOVED'] }],
    },
  ];
  const result = reconcileMenuSelections(saved, standard);
  assert.equal(result.pending.length, 1);
  assert.equal(result.validSelections[0].menuId, 'new-food');
  assert.deepEqual(result.validSelections[0].sections, [
    { sectionTitle: 'Rice', items: ['JEERA RICE'] },
  ]);
  assert.equal(
    reconcileMenuSelections(
      [
        {
          ...saved[0],
          sections: [{ sectionTitle: 'Other', items: ['JEERA RICE'] }],
        },
      ],
      standard,
    ).pending.length,
    1,
  );
});

test('custom standard menus remain intact, but cannot leak into flexible categories', () => {
  const custom = {
    menuId: 'custom:menu',
    title: 'Custom Menu',
    sections: [{ sectionTitle: 'Special', items: ['Special dish'] }],
  };
  assert.equal(
    reconcileMenuSelections([custom], { menuRules: [] }).pending.length,
    0,
  );
  assert.equal(reconcileMenuSelections([custom], category).pending.length, 1);
});

test('empty new booking and unavailable category do not silently consume selections', () => {
  assert.deepEqual(reconcileMenuSelections([], category).selections, []);
  assert.equal(reconcileMenuSelections([old], undefined).pending.length, 1);
});

test('primary and additional packages reconcile independently without changing pricing or saved snapshots', () => {
  const categories = [
    { ...category, id: 'primary' },
    {
      ...category,
      id: 'additional',
      flexibleChoiceGroups: [
        { ...category.flexibleChoiceGroups[0], menuId: 'additional-drink' },
      ],
    },
  ];
  const primary = {
    categoryId: 'primary',
    selectedMenus: [old],
    customPricePerPlate: '499',
    pax: 50,
  };
  const additional = {
    categoryId: 'additional',
    selectedMenus: [old],
    customPricePerPlate: '799',
    pax: 25,
  };
  assert.equal(
    reconcileMenuPackage(primary, categories).selectedMenus[0].menuId,
    'new-drink',
  );
  assert.equal(
    reconcileMenuPackage(additional, categories).selectedMenus[0].menuId,
    'additional-drink',
  );
  assert.equal(
    reconcileMenuPackage(primary, categories).customPricePerPlate,
    '499',
  );
  assert.equal(reconcileMenuPackage(additional, categories).pax, 25);
  assert.equal(primary.selectedMenus[0].menuId, 'old-drink');
  assert.equal(additional.selectedMenus[0].menuId, 'old-drink');
});

test('editing visible items does not discard an unresolved hidden destination in the same menu', () => {
  const saved = [
    {
      ...old,
      menuId: 'new-drink',
      sections: [{ sectionTitle: 'Removed section', items: ['OLD ITEM'] }],
    },
  ];
  const result = reconcileMenuSelections(saved, category);
  const afterUncheck = keepPendingMenuSelections([], result.pending);
  assert.equal(
    reconcileMenuSelections(afterUncheck, category).pending[0].item,
    'OLD ITEM',
  );
  assert.equal(
    reconcileMenuSelections(afterUncheck, category).validSelections.length,
    0,
  );
});

test('repeated reconciliation preserves original titles of unmatched sections instead of remapping them into another menu', () => {
  const config = { menuRules: [
    { menuId: 'old', menuTitle: 'Renamed', sectionTitle: 'Keep', allowedItems: ['A'] },
    { menuId: 'different', menuTitle: 'Renamed', sectionTitle: 'Lost', allowedItems: ['B'] },
  ] };
  const saved = [{ menuId: 'old', title: 'Original', sections: [{ sectionTitle: 'Keep', items: ['A'] }, { sectionTitle: 'Lost', items: ['B'] }] }];
  const first = reconcileMenuSelections(saved, config);
  const second = reconcileMenuSelections(first.selections, config);
  assert.equal(second.pending.length, 1);
  assert.equal(second.pending[0].title, 'Original');
  assert.equal(second.validSelections.some((menu) => menu.menuId === 'different'), false);
});

test('does not rewrite old IDs using cached configuration while the latest category is loading', () => {
  const saved = [old];
  const waiting = reconcileLoadedMenuSelections(saved, category, null);
  assert.equal(waiting[0].menuId, 'old-drink');
  const fresh = { ...category, flexibleChoiceGroups: [...category.flexibleChoiceGroups, { ...category.flexibleChoiceGroups[0], menuId: 'second-match' }] };
  const loaded = reconcileLoadedMenuSelections(waiting, fresh, fresh);
  assert.equal(reconcileMenuSelections(loaded, fresh).pending.length, 1);
  assert.equal(loaded[0].menuId, 'old-drink');
});

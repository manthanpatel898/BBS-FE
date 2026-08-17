import assert from 'node:assert/strict';
import {
  addFlexibleAddonItem,
  categorySelectionMode,
  countFlexibleGroupSelection,
  removeFlexibleAddonItem,
  toggleFlexibleDirectItem,
  toggleFlexibleSubmenuItem,
} from './flexible-menu-selection';

const standardCategory = {
  menuRules: [
    {
      menuId: 'menu-standard',
      menuTitle: 'Soup',
      sectionTitle: 'Soup',
      allowedItems: ['Tomato Soup'],
      selectionLimit: 1,
    },
  ],
  flexibleChoiceGroups: [],
};
const flexibleCategory = {
  menuRules: [],
  flexibleChoiceGroups: [
    {
      groupId: 'group-1',
      menuId: 'menu-flexible',
      menuTitle: 'Starter / Farsan',
      includedChoices: 2,
      allowedDirectItems: ['Welcome Platter'],
      submenuRules: [
        { sectionTitle: 'Starter', allowedItems: ['Paneer Tikka'] },
        { sectionTitle: 'Farsan', allowedItems: ['Khaman'] },
      ],
    },
  ],
};

assert.equal(categorySelectionMode(standardCategory), 'STANDARD');
assert.equal(categorySelectionMode(flexibleCategory), 'FLEXIBLE');

const selectedMenus = [
  {
    menuId: 'menu-flexible',
    title: 'Starter / Farsan',
    directItems: ['Welcome Platter'],
    sections: [
      { sectionTitle: 'Starter', items: ['Paneer Tikka'] },
      { sectionTitle: 'Farsan', items: ['Khaman'] },
    ],
  },
];
assert.deepEqual(
  countFlexibleGroupSelection(
    flexibleCategory.flexibleChoiceGroups[0]!,
    selectedMenus,
  ),
  { selected: 3, included: 2, additional: 1 },
);

const removed = toggleFlexibleDirectItem(
  selectedMenus,
  flexibleCategory.flexibleChoiceGroups[0]!,
  'Welcome Platter',
  false,
);
assert.deepEqual(removed[0]?.directItems, []);
assert.equal(removed[0]?.sections[0]?.items[0], 'Paneer Tikka');

const added = toggleFlexibleDirectItem(
  [],
  flexibleCategory.flexibleChoiceGroups[0]!,
  'Welcome Platter',
  true,
);
assert.deepEqual(added, [
  {
    menuId: 'menu-flexible',
    title: 'Starter / Farsan',
    directItems: ['Welcome Platter'],
    sections: [],
  },
]);

const submenuRemoved = toggleFlexibleSubmenuItem(
  selectedMenus,
  flexibleCategory.flexibleChoiceGroups[0]!,
  'Starter',
  'Paneer Tikka',
  false,
);
assert.deepEqual(submenuRemoved[0]?.directItems, ['Welcome Platter']);
assert.deepEqual(submenuRemoved[0]?.sections, [
  { sectionTitle: 'Farsan', items: ['Khaman'] },
]);

const submenuAdded = toggleFlexibleSubmenuItem(
  [],
  flexibleCategory.flexibleChoiceGroups[0]!,
  'Starter',
  'Paneer Tikka',
  true,
);
assert.deepEqual(submenuAdded[0], {
  menuId: 'menu-flexible',
  title: 'Starter / Farsan',
  directItems: [],
  sections: [{ sectionTitle: 'Starter', items: ['Paneer Tikka'] }],
});

const directAddonAdded = addFlexibleAddonItem(
  [],
  flexibleCategory.flexibleChoiceGroups[0]!,
  { type: 'DIRECT' },
  'Chef Special Platter',
);
assert.deepEqual(directAddonAdded, [
  {
    menuId: 'menu-flexible',
    title: 'Starter / Farsan',
    directItems: ['Chef Special Platter'],
    sections: [],
  },
]);

const configuredItemEnteredAsAddon = addFlexibleAddonItem(
  [],
  flexibleCategory.flexibleChoiceGroups[0]!,
  { type: 'DIRECT' },
  ' welcome platter ',
);
assert.deepEqual(configuredItemEnteredAsAddon[0]?.directItems, ['Welcome Platter']);

const submenuAddonAdded = addFlexibleAddonItem(
  selectedMenus,
  flexibleCategory.flexibleChoiceGroups[0]!,
  { type: 'SUBMENU', sectionTitle: 'Starter' },
  '  Dragon Paneer  ',
);
assert.deepEqual(submenuAddonAdded[0]?.sections[0]?.items, [
  'Paneer Tikka',
  'Dragon Paneer',
]);

const duplicateAddonIgnored = addFlexibleAddonItem(
  submenuAddonAdded,
  flexibleCategory.flexibleChoiceGroups[0]!,
  { type: 'SUBMENU', sectionTitle: 'Starter' },
  'dragon paneer',
);
assert.deepEqual(duplicateAddonIgnored, submenuAddonAdded);

const addonRemoved = removeFlexibleAddonItem(
  submenuAddonAdded,
  flexibleCategory.flexibleChoiceGroups[0]!,
  { type: 'SUBMENU', sectionTitle: 'Starter' },
  'Dragon Paneer',
);
assert.deepEqual(addonRemoved, selectedMenus);

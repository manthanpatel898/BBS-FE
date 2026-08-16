import assert from 'node:assert/strict';

async function main() {
  const builder = await import('./flexible-category-builder');
  const draft = builder.createFlexibleCategoryDraft();

  assert.equal(draft.groups.length, 1, 'a flexible category starts with one choice group');
  assert.equal(builder.validateFlexibleCategoryDraft(draft).isValid, false);

  const configured = {
    ...draft,
    name: 'Flexi',
    pricePerPlate: '799',
    groups: [
      {
        ...draft.groups[0],
        menuMode: 'CREATE' as const,
        menuTitle: 'Starter / Farsan',
        includedChoices: '2',
        directItems: ['Welcome Drink'],
        submenus: [
          { id: 'submenu-1', title: 'Starter', items: ['Paneer Tikka'] },
          { id: 'submenu-2', title: 'Farsan', items: ['Khaman'] },
        ],
      },
    ],
  };

  assert.equal(builder.validateFlexibleCategoryDraft(configured).isValid, true);
  const payload = builder.buildFlexibleCategoryPayload(configured);
  assert.equal(payload.pricePerPlate, 799);
  assert.equal(payload.groups[0]?.includedChoices, 2);
  assert.deepEqual(payload.menus[0]?.directItems?.items, ['Welcome Drink']);
  assert.deepEqual(payload.menus[0]?.sections[1]?.items, ['Khaman']);
  assert.equal(payload.groups[0]?.clientKey, configured.groups[0]?.id);

  const excessive = {
    ...configured,
    groups: [{ ...configured.groups[0], includedChoices: '4' }],
  };
  assert.match(
    builder.validateFlexibleCategoryDraft(excessive).errors[configured.groups[0]!.id] ?? '',
    /cannot exceed/i,
  );
}

void main();

import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlexibleCategoryBuilder } from './flexible-category-builder';
import { createFlexibleCategoryDraft } from '@/lib/categories/flexible-category-builder';

async function main() {
  const html = renderToStaticMarkup(
    <FlexibleCategoryBuilder
      draft={createFlexibleCategoryDraft()}
      menus={[]}
      errors={{}}
      onChange={() => undefined}
    />,
  );

  assert.match(html, /Create new reusable menu/);
  assert.match(html, /Use existing menu/);
  assert.match(html, /Included choices across this menu/);
  assert.match(html, /Add direct item/);
  assert.match(html, /Bulk Add Items/);
  assert.match(html, /Bulk Delete Items/);
  assert.match(html, /Add optional submenu/);
  assert.doesNotMatch(html, /overflow-x-auto/);
  assert.match(html, /data-mobile-layout="flexible-category-builder"/);
  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /Collapse choice group 1/);
  assert.match(html, /sm:hidden/);
  assert.match(html, /Choice limit/);
  assert.match(html, /Direct items/);
  assert.match(html, /Submenus/);

  const editDraft = createFlexibleCategoryDraft();
  editDraft.groups[0] = {
    ...editDraft.groups[0]!,
    menuMode: 'REVISE',
    sourceMenuId: '67f13bbfd53448f7ab18d011',
    menuTitle: 'Starter / Farsan',
    directItems: ['Welcome Drink'],
  };
  const editHtml = renderToStaticMarkup(
    <FlexibleCategoryBuilder draft={editDraft} menus={[]} errors={{}} onChange={() => undefined} />,
  );
  assert.match(editHtml, /Edit this category&#x27;s menu/);
  assert.match(editHtml, /category-specific menu revision/);
  assert.match(editHtml, /Welcome Drink/);
  assert.match(editHtml, /Menu name/);
  assert.match(editHtml, /Bulk Delete Items/);
}

void main();

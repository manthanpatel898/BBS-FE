import assert from 'node:assert/strict';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { FlexibleMenuSelector } from './flexible-menu-selector';

async function main() {
  const html = renderToStaticMarkup(
    <FlexibleMenuSelector
      groups={[
        {
          groupId: 'group-one',
          menuId: '67f13bbfd53448f7ab18d011',
          menuTitle: 'Starter / Farsan',
          includedChoices: 2,
          allowedDirectItems: ['Paneer Tikka'],
          submenuRules: [],
        },
        {
          groupId: 'group-two',
          menuId: '67f13bbfd53448f7ab18d012',
          menuTitle: 'Dessert',
          includedChoices: 1,
          allowedDirectItems: ['Gulab Jamun'],
          submenuRules: [],
        },
      ]}
      selectedMenus={[]}
      onChange={() => undefined}
    />,
  );

  assert.match(html, /aria-expanded="true"/);
  assert.match(html, /aria-expanded="false"/);
  assert.match(html, /aria-controls="flexible-menu-group-one"/);
  assert.match(html, /id="flexible-menu-group-one"/);
  assert.match(html, /Collapse Starter \/ Farsan/);
  assert.match(html, /Expand Dessert/);
  assert.match(html, /0 selected · 2 included/);
  assert.match(html, /data-mobile-layout="flexible-menu-selector"/);
}

void main();

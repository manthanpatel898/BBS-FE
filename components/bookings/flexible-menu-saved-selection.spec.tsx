import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { FlexibleMenuSelector } from './flexible-menu-selector';
import type { FlexibleSelectedMenu } from '@/lib/bookings/flexible-menu-selection';
afterEach(cleanup);

test('saved items remain checked inside expandable menus even when configuration no longer contains them', () => {
  function Harness() {
    const [selected, setSelected] = useState<FlexibleSelectedMenu[]>([
      { menuId: 'dessert-old', title: 'Dessert', directItems: ['Trifle pudding'], sections: [] },
      { menuId: 'soup', title: 'Soup', directItems: ['Saved soup'], sections: [] },
    ]);
    return <FlexibleMenuSelector groups={[{ groupId: 'soup-group', menuId: 'soup', menuTitle: 'Soup', includedChoices: 2, allowedDirectItems: ['Tomato soup'], submenuRules: [] }]} selectedMenus={selected} onChange={setSelected} />;
  }
  render(<Harness />);
  assert.equal(screen.getByRole('button', { name: 'Saved soup' }).getAttribute('aria-pressed'), 'true');
  assert.equal(screen.getByRole('button', { name: 'Tomato soup' }).getAttribute('aria-pressed'), 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Collapse Soup' }));
  assert.equal(screen.queryByRole('button', { name: 'Saved soup' }), null);
  fireEvent.click(screen.getByRole('button', { name: 'Expand Soup' }));
  assert.equal(screen.getByRole('button', { name: 'Saved soup' }).getAttribute('aria-pressed'), 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Expand Dessert' }));
  assert.equal(screen.getByRole('button', { name: 'Trifle pudding' }).getAttribute('aria-pressed'), 'true');
  fireEvent.click(screen.getByRole('button', { name: 'Trifle pudding' }));
  assert.equal(screen.queryByRole('button', { name: 'Trifle pudding' }), null);
  assert.equal(screen.queryByText('Previously selected — needs review'), null);
});

test('saved submenu selections can be unchecked without changing another section', () => {
  function Harness() {
    const [selected, setSelected] = useState<FlexibleSelectedMenu[]>([
      { menuId: 'food', title: 'Food', directItems: [], sections: [
        { sectionTitle: 'Dessert', items: ['Trifle pudding'] },
        { sectionTitle: 'Sides', items: ['Roasted papad'] },
      ] },
    ]);
    return <FlexibleMenuSelector groups={[{ groupId: 'food-group', menuId: 'food', menuTitle: 'Food', includedChoices: 2, allowedDirectItems: [], submenuRules: [{ sectionTitle: 'Dessert', allowedItems: ['Trifle pudding', 'Ice cream'] }] }]} selectedMenus={selected} onChange={setSelected} />;
  }
  render(<Harness />);
  assert.equal(screen.getByRole('button', { name: 'Trifle pudding' }).getAttribute('aria-pressed'), 'true');
  assert.equal(screen.getByRole('button', { name: 'Ice cream' }).getAttribute('aria-pressed'), 'false');
  fireEvent.click(screen.getByRole('button', { name: 'Trifle pudding' }));
  assert.equal(screen.getByRole('button', { name: 'Trifle pudding' }).getAttribute('aria-pressed'), 'false');
  assert.equal(screen.getByRole('button', { name: 'Roasted papad' }).getAttribute('aria-pressed'), 'true');
});

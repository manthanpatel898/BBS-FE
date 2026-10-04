import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import { afterEach, test } from 'node:test';
import React, { useState } from 'react';
import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { MenuSelectionReview } from './menu-selection-review';
import {
  reconcileMenuSelections,
  resolveReviewedItem,
} from '@/lib/bookings/menu-selection-reconciliation';
import { FlexibleMenuSelector } from './flexible-menu-selector';
afterEach(cleanup);

test('restored old selection is visibly checked once and can be deselected without reviving its stale ID', () => {
  const group = {
    groupId: 'drinks',
    menuId: 'new',
    menuTitle: 'Drinks',
    includedChoices: 1,
    allowedDirectItems: ['Peach Mint Mojito'],
    submenuRules: [],
  };
  function Harness() {
    const [selected, setSelected] = useState(
      () =>
        reconcileMenuSelections(
          [
            {
              menuId: 'old',
              title: 'Drinks',
              directItems: ['Peach Mint Mojito'],
              sections: [],
            },
            {
              menuId: 'new',
              title: 'Drinks',
              directItems: ['Peach Mint Mojito'],
              sections: [],
            },
          ],
          { menuRules: [], flexibleChoiceGroups: [group] },
        ).selections,
    );
    return (
      <FlexibleMenuSelector
        groups={[group]}
        selectedMenus={selected}
        onChange={setSelected}
      />
    );
  }
  render(<Harness />);
  const choice = screen.getByRole('button', { name: /Peach Mint Mojito/ });
  assert.equal(choice.getAttribute('aria-pressed'), 'true');
  assert.ok(screen.getByText('1 selected · 1 included'));
  fireEvent.click(choice);
  assert.equal(choice.getAttribute('aria-pressed'), 'false');
  assert.ok(screen.getByText('0 selected · 1 included'));
});

test('shows unmatched items and only removes them after explicit confirmation', () => {
  function Harness() {
    const [selected, setSelected] = useState([
      {
        menuId: 'old',
        title: 'Drinks',
        directItems: ['Old drink'],
        sections: [],
      },
    ]);
    const review = reconcileMenuSelections(selected, { menuRules: [] });
    return (
      <MenuSelectionReview
        review={review}
        onResolve={(item, replacement) =>
          setSelected(
            resolveReviewedItem(selected, item, replacement) as typeof selected,
          )
        }
      />
    );
  }
  render(<Harness />);
  assert.ok(screen.getByText('Old drink'));
  fireEvent.click(screen.getByRole('button', { name: 'Remove Old drink' }));
  assert.ok(screen.getByText('Old drink'));
  fireEvent.click(screen.getByRole('button', { name: 'Confirm removal' }));
  assert.equal(screen.queryByText('Old drink'), null);
});

test('replacement requires an explicit apply action and clears the pending selection', () => {
  function Harness() {
    const [selected, setSelected] = useState([
      {
        menuId: 'old',
        title: 'Drinks',
        directItems: ['Old drink'],
        sections: [],
      },
    ]);
    const review = reconcileMenuSelections(selected, {
      menuRules: [],
      flexibleChoiceGroups: [
        {
          menuId: 'new',
          menuTitle: 'Drinks',
          allowedDirectItems: ['New drink'],
          submenuRules: [],
        },
      ],
    });
    return (
      <>
        <MenuSelectionReview
          review={review}
          onResolve={(item, replacement) =>
            setSelected(
              resolveReviewedItem(
                selected,
                item,
                replacement,
              ) as typeof selected,
            )
          }
        />
        <output>{selected[0]?.directItems?.join(',')}</output>
      </>
    );
  }
  render(<Harness />);
  fireEvent.change(screen.getByLabelText('Replace Old drink'), {
    target: { value: '0' },
  });
  assert.equal(screen.getByRole('status').textContent, 'Old drink');
  fireEvent.click(screen.getByRole('button', { name: 'Apply replacement' }));
  assert.equal(screen.getByRole('status').textContent, 'New drink');
  assert.equal(screen.queryByText('Previously selected — needs review'), null);
});

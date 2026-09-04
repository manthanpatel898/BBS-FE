import assert from 'node:assert/strict';
import test from 'node:test';
import {
  getRenderableMenuSections,
  getRenderableMenus,
  getRenderableMenuTitle,
} from './menu-snapshot';

test('renders flexible direct items under a stable Menu Items section', () => {
  const menu = {
    menuId: 'menu-1',
    title: 'Soups',
    directItems: ['Tomato Soup', 'Sweet Corn Soup'],
    sections: [],
  };

  assert.deepEqual(getRenderableMenuSections(menu), [
    { sectionTitle: 'Menu Items', items: ['Tomato Soup', 'Sweet Corn Soup'] },
  ]);
});

test('preserves traditional structured menu sections without adding a direct section', () => {
  const menu = {
    menuId: 'menu-2',
    title: 'Starters / Farsan',
    sections: [
      { sectionTitle: 'Starters', items: ['Mexican Tikki'] },
      { sectionTitle: 'Farsan', items: ['Jodhpuri Mirchi Wada'] },
    ],
  };

  assert.deepEqual(getRenderableMenuSections(menu), menu.sections);
});

test('renders mixed flexible selections with direct items before submenu sections', () => {
  const menu = {
    menuId: 'menu-3',
    title: 'Mixed Menu',
    directItems: ['Direct Item'],
    sections: [{ sectionTitle: 'Premium', items: ['Premium Item'] }],
  };

  assert.deepEqual(getRenderableMenuSections(menu), [
    { sectionTitle: 'Menu Items', items: ['Direct Item'] },
    { sectionTitle: 'Premium', items: ['Premium Item'] },
  ]);
});

test('filters menus that have no selected direct or structured items', () => {
  const menus = [
    { menuId: 'empty', title: 'Empty', directItems: [], sections: [] },
    { menuId: 'filled', title: 'Filled', directItems: ['Selected'], sections: [] },
  ];

  assert.deepEqual(getRenderableMenus(menus).map((menu) => menu.menuId), ['filled']);
});

test('does not expose mongodb ids as menu snapshot titles', () => {
  const menu = {
    menuId: '69d7e93288b48537416cda78',
    title: '69d7e93288b48537416cda78',
    sections: [{ sectionTitle: 'Mocktail', items: ['Assorted Soft Drinks'] }],
  };

  assert.equal(getRenderableMenuTitle(menu), 'Mocktail');
});

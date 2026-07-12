import assert from 'node:assert/strict';
import test from 'node:test';

import { buildChangedFields } from './changed-fields.ts';

test('returns only pax when pax is the only changed field', () => {
  const original = { pax: 200, customer: { firstName: 'Bhailal', lastName: '' } };
  const current = { pax: 201, customer: { firstName: 'Bhailal', lastName: '' } };

  assert.deepEqual(buildChangedFields(original, current), { pax: 201 });
});

test('returns only the changed nested customer property', () => {
  const original = { customer: { firstName: 'Bhailal', lastName: '', phone: '123' } };
  const current = { customer: { firstName: 'Bhailal Gothi', lastName: '', phone: '123' } };

  assert.deepEqual(buildChangedFields(original, current), {
    customer: { firstName: 'Bhailal Gothi' },
  });
});

test('preserves an explicit empty string used to clear an optional field', () => {
  assert.deepEqual(buildChangedFields({ notes: 'Old note' }, { notes: '' }), { notes: '' });
});

test('omits equal arrays and emits changed arrays atomically', () => {
  const menus = [{ menuId: 'menu-1', sections: [{ sectionTitle: 'Soup', items: ['Tomato'] }] }];

  assert.deepEqual(buildChangedFields({ selectedMenus: menus }, { selectedMenus: structuredClone(menus) }), {});
  assert.deepEqual(
    buildChangedFields(
      { selectedMenus: menus },
      { selectedMenus: [{ menuId: 'menu-1', sections: [{ sectionTitle: 'Soup', items: ['Corn'] }] }] },
    ),
    { selectedMenus: [{ menuId: 'menu-1', sections: [{ sectionTitle: 'Soup', items: ['Corn'] }] }] },
  );
});

test('returns an empty object when nothing changed and omits undefined values', () => {
  assert.deepEqual(buildChangedFields({ pax: 200 }, { pax: 200, notes: undefined }), {});
});

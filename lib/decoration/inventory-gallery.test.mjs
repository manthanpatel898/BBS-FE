import test from 'node:test';
import assert from 'node:assert/strict';
import {
  filterInventoryItems,
  getInventoryCoverImage,
  getInventoryDisabledReason,
} from './inventory-gallery.ts';

const categories = [
  { id: 'sofa', name: 'Sofa', isActive: true },
  { id: 'entry', name: 'Couple Entry', isActive: true },
];

const image = (id, isCover = false) => ({
  id,
  key: `catalog/${id}.webp`,
  url: `https://cdn.example/${id}.webp`,
  isCover,
});

const item = (patch = {}) => ({
  id: 'royal-sofa',
  categoryId: 'sofa',
  name: 'Royal Gold Sofa',
  description: 'Gold finish',
  totalQuantity: 4,
  availableQuantity: 3,
  maintenanceQuantity: 0,
  images: [image('first'), image('cover-image', true)],
  units: [],
  isActive: true,
  ...patch,
});

test('filters active inventory by name and category without hiding unavailable items', () => {
  const items = [
    item(),
    item({ id: 'silver-sofa', name: 'Silver Sofa', availableQuantity: 0 }),
    item({ id: 'royal-entry', categoryId: 'entry', name: 'Royal Entry' }),
    item({ id: 'inactive', name: 'Royal Hidden Sofa', isActive: false }),
  ];

  assert.deepEqual(
    filterInventoryItems(items, categories, 'royal', 'sofa').map(
      (entry) => entry.id,
    ),
    ['royal-sofa'],
  );
  assert.deepEqual(
    filterInventoryItems(items, categories, 'SILVER', '').map(
      (entry) => entry.id,
    ),
    ['silver-sofa'],
  );
  assert.equal(
    getInventoryDisabledReason(
      item({ id: 'unavailable', availableQuantity: 0 }),
    ),
    'Not available',
  );
});

test('searches decoration type names and preserves catalog order', () => {
  const items = [
    item({ id: 'entry-one', categoryId: 'entry', name: 'Classic Walkway' }),
    item({ id: 'sofa-one', name: 'Classic Sofa' }),
  ];

  assert.deepEqual(
    filterInventoryItems(items, categories, 'couple entry', '').map(
      (entry) => entry.id,
    ),
    ['entry-one'],
  );
});

test('requires a valid image and prefers the configured cover image', () => {
  assert.equal(
    getInventoryDisabledReason(item({ images: [] })),
    'Image required',
  );
  assert.equal(
    getInventoryDisabledReason(
      item({ images: [{ id: 'broken', key: '', url: '', isCover: true }] }),
    ),
    'Image required',
  );
  assert.equal(getInventoryCoverImage(item())?.id, 'cover-image');
  assert.equal(
    getInventoryCoverImage(
      item({ images: [image('usable-first'), image('second')] }),
    )?.id,
    'usable-first',
  );
});

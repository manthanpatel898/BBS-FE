import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import {
  cleanup,
  fireEvent,
  render,
  waitFor,
  within,
} from '@testing-library/react';
import { DecorationSelectionModalContent } from '../../components/decoration/decoration-selection-modal';

const page = () => within(document.body);
const image = (id: string, isCover = false) => ({
  id,
  key: `catalog/${id}.webp`,
  url: `https://cdn.example/${id}.webp`,
  isCover,
});
const categories = [
  { id: 'sofa', name: 'Sofa', description: null, displayOrder: 1, isActive: true },
  { id: 'entry', name: 'Couple Entry', description: null, displayOrder: 2, isActive: true },
] as any;
const inventory = [
  {
    id: 'royal-sofa',
    categoryId: 'sofa',
    name: 'Royal Gold Sofa',
    description: 'Gold finish',
    availableQuantity: 3,
    totalQuantity: 4,
    maintenanceQuantity: 0,
    isActive: true,
    images: [image('first'), image('cover', true), image('alternate')],
    units: [],
  },
  {
    id: 'silver-sofa',
    categoryId: 'sofa',
    name: 'Silver Sofa',
    description: null,
    availableQuantity: 0,
    totalQuantity: 1,
    maintenanceQuantity: 0,
    isActive: true,
    images: [image('silver', true)],
    units: [],
  },
  {
    id: 'image-missing',
    categoryId: 'entry',
    name: 'Plain Entry',
    description: null,
    availableQuantity: 2,
    totalQuantity: 2,
    maintenanceQuantity: 0,
    isActive: true,
    images: [],
    units: [],
  },
] as any;
const booking = {
  id: 'booking-1',
  customer: { name: 'Customer' },
  decorationSnapshot: [],
  totalCollected: 0,
} as any;

const common = {
  booking,
  onClose() {},
  onSaved() {},
  accessToken: 'token',
  loadCategories: async () => categories,
  loadItems: async () => inventory,
  loadDraft: async () => null,
  saveDraftRequest: async (_token: string, _id: string, payload: any) => ({
    id: 'draft',
    bookingId: 'booking-1',
    restaurantId: 'restaurant-1',
    ...payload,
  }),
};

test.afterEach(() => cleanup());

test('browses visual inventory, filters, blocks unavailable items, and selects the cover image', async () => {
  render(<DecorationSelectionModalContent {...common} />);
  fireEvent.click(
    await page().findByRole('button', { name: 'Browse Existing Inventory' }),
  );
  assert.ok(
    await page().findByRole('dialog', { name: 'Browse Existing Inventory' }),
  );

  const unavailable = page().getByRole('button', {
    name: /Silver Sofa, Sofa, Not available/,
  });
  const imageMissing = page().getByRole('button', {
    name: /Plain Entry, Couple Entry, Image required/,
  });
  assert.equal(unavailable.hasAttribute('disabled'), true);
  assert.equal(imageMissing.hasAttribute('disabled'), true);

  fireEvent.change(page().getByRole('searchbox', { name: 'Search inventory' }), {
    target: { value: 'royal' },
  });
  assert.equal(page().queryByText('Silver Sofa'), null);
  fireEvent.click(page().getByRole('button', { name: 'Sofa' }));
  fireEvent.click(
    page().getByRole('button', {
      name: /Royal Gold Sofa, Sofa, 3 available/,
    }),
  );

  assert.ok(await page().findByText('Catalog item'));
  assert.equal(
    (page().getByAltText('Royal Gold Sofa') as HTMLImageElement).src,
    'https://cdn.example/cover.webp',
  );
  assert.equal(
    (page().getByLabelText('Quantity for image 1') as HTMLInputElement).value,
    '1',
  );
});

test('already-selected inventory focuses one note and alternate image selection preserves it', async () => {
  render(<DecorationSelectionModalContent {...common} />);
  const browse = await page().findByRole('button', {
    name: 'Browse Existing Inventory',
  });
  fireEvent.click(browse);
  fireEvent.click(
    await page().findByRole('button', {
      name: /Royal Gold Sofa, Sofa, 3 available/,
    }),
  );
  fireEvent.click(browse);
  fireEvent.click(
    await page().findByRole('button', {
      name: /Royal Gold Sofa, Sofa, Already selected/,
    }),
  );

  await waitFor(() =>
    assert.equal(document.querySelectorAll('[data-note-id]').length, 1),
  );
  await waitFor(() =>
    assert.equal(
      Boolean(document.activeElement?.getAttribute('data-note-id')),
      true,
    ),
  );

  fireEvent.click(page().getByRole('button', { name: 'Change image' }));
  fireEvent.click(
    await page().findByRole('button', {
      name: 'Royal Gold Sofa image 3',
    }),
  );
  assert.equal(
    (page().getByAltText('Royal Gold Sofa') as HTMLImageElement).src,
    'https://cdn.example/alternate.webp',
  );
});

import '@/lib/decoration/image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { cleanup, render, waitFor, within } from '@testing-library/react';
import { BulkMenuItemsModal } from './bulk-menu-items-modal';
import { BulkDeleteMenuItemsModal } from './bulk-delete-menu-items-modal';

test.afterEach(() => cleanup());

test('bulk add is portalled above the category modal with a mobile fixed footer', async () => {
  const categoryModal = document.createElement('div');
  categoryModal.dataset.testid = 'category-modal';
  document.body.appendChild(categoryModal);

  render(
    <BulkMenuItemsModal title="Direct items" existingItems={[]} onApply={() => {}} onClose={() => {}} />,
    { container: categoryModal },
  );

  await waitFor(() => assert.ok(document.body.querySelector('[data-mobile-full-screen="true"]')));
  assert.equal(categoryModal.querySelector('[role="dialog"]'), null);
  const footer = document.body.querySelector('[data-modal-footer="true"]');
  assert.ok(footer);
  assert.ok(within(footer as HTMLElement).getByRole('button', { name: 'Cancel' }));
  assert.ok(within(footer as HTMLElement).getByRole('button', { name: 'Add 0 items' }));
  categoryModal.remove();
});

test('bulk delete uses the same isolated mobile footer', async () => {
  const categoryModal = document.createElement('div');
  document.body.appendChild(categoryModal);

  render(
    <BulkDeleteMenuItemsModal title="Starter" items={['Paneer Tikka']} onDelete={() => {}} onClose={() => {}} />,
    { container: categoryModal },
  );

  await waitFor(() => assert.ok(document.body.querySelector('[data-mobile-full-screen="true"]')));
  assert.equal(categoryModal.querySelector('[role="dialog"]'), null);
  const footer = document.body.querySelector('[data-modal-footer="true"]');
  assert.ok(footer);
  assert.ok(within(footer as HTMLElement).getByRole('button', { name: 'Delete 0 selected' }));
  categoryModal.remove();
});

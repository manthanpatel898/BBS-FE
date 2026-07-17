import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { type ComponentType } from 'react';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import {
  CatalogItemCard,
  ItemModal,
  type CatalogCropModalProps,
} from '../../components/decoration/settings/decoration-catalog-section';

const page = () => within(document.body);
const png = (name: string, tail = 1) => new File([
  Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, tail]),
], name, { type: 'image/png' });

const FakeCropModal: ComponentType<CatalogCropModalProps> = ({ file, onCancel, onConfirm }) => <div role="dialog" aria-label="Crop test image">
  <span>{file.name}</span>
  <button type="button" onClick={onCancel}>Cancel crop</button>
  <button type="button" onClick={() => void onConfirm(png(`cropped-${file.name}`, 2))}>Confirm crop</button>
</div>;

test.afterEach(() => cleanup());

test('Add Item opens crop first, cancel is inert, and save receives only confirmed cropped bytes', async () => {
  const saved: File[] = [];
  render(<ItemModal
    value="new"
    categoryId="type-1"
    onClose={() => {}}
    onSave={async (_form, image) => { if (image) saved.push(image); }}
    CropModal={FakeCropModal}
  />);

  const input = document.querySelector<HTMLInputElement>('input[type="file"]');
  assert.ok(input);
  fireEvent.change(input, { target: { files: [png('source.png')] } });
  assert.ok(await page().findByRole('dialog', { name: 'Crop test image' }));
  assert.equal(saved.length, 0);
  fireEvent.click(page().getByRole('button', { name: 'Cancel crop' }));
  assert.equal(page().queryByAltText('Selected item preview'), null);
  assert.equal(saved.length, 0);

  fireEvent.change(input, { target: { files: [png('replacement.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Confirm crop' }));
  await page().findByAltText('Selected item preview');
  fireEvent.change(page().getByLabelText('Item name'), { target: { value: 'Arch' } });
  fireEvent.click(page().getByRole('button', { name: 'Save item' }));
  await waitFor(() => assert.equal(saved.length, 1));
  assert.equal(saved[0].name, 'cropped-replacement.png');
});

test('existing item crops before upload, retries retained crop after failure, and preserves the 12-image limit', async () => {
  const uploaded: File[] = [];
  let attempts = 0;
  const item = {
    id: 'item-1', categoryId: 'type-1', name: 'Arch', description: '',
    totalQuantity: 1, availableQuantity: 1, isActive: true, images: [],
  } as any;
  const view = render(<CatalogItemCard
    item={item}
    categoryName="Stage"
    manage
    token="token"
    onEdit={() => {}}
    onChanged={() => {}}
    onError={() => {}}
    onToggle={() => {}}
    CropModal={FakeCropModal}
    uploadImage={async (_token, _id, file) => {
      uploaded.push(file);
      attempts += 1;
      if (attempts === 1) throw new Error('offline');
      return item;
    }}
  />);
  const input = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  assert.ok(input);
  fireEvent.change(input, { target: { files: [png('camera.png')] } });
  assert.equal(uploaded.length, 0);
  fireEvent.click(await page().findByRole('button', { name: 'Confirm crop' }));
  await waitFor(() => assert.equal(uploaded.length, 1));
  assert.equal(uploaded[0].name, 'cropped-camera.png');
  assert.ok(page().getByRole('button', { name: 'Retry image upload' }));
  fireEvent.click(page().getByRole('button', { name: 'Retry image upload' }));
  await waitFor(() => assert.equal(uploaded.length, 2));
  assert.equal(uploaded[1], uploaded[0]);

  view.rerender(<CatalogItemCard {...{
    item: { ...item, images: Array.from({ length: 12 }, (_, index) => ({ id: String(index), url: 'x', isCover: index === 0 })) },
    categoryName: 'Stage', manage: true, token: 'token', onEdit() {}, onChanged() {}, onToggle() {},
    onError(error: string) { assert.match(error, /12 images/i); }, CropModal: FakeCropModal,
    uploadImage: async () => { assert.fail('must not upload'); },
  }} />);
  const limitedInput = view.container.querySelector<HTMLInputElement>('input[type="file"]');
  assert.ok(limitedInput);
  fireEvent.change(limitedInput, { target: { files: [png('thirteenth.png')] } });
  assert.equal(page().queryByRole('dialog', { name: 'Crop test image' }), null);
});

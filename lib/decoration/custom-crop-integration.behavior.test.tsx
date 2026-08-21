import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { StrictMode, type ComponentType } from 'react';
import { cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import {
  DecorationSelectionModalContent,
  type CustomCropModalProps,
} from '../../components/decoration/decoration-selection-modal';
import { DecorationImageCropModal, type DecorationCropperAdapterProps } from '../../components/decoration/decoration-image-crop-modal';

const page = () => within(document.body);
const png = (name: string, value = 'source') => new File([value], name, { type: 'image/png' });
const uploadedImage = (key = 'key') => ({ key, url: 'url', mimeType: 'image/png', sizeBytes: 7, displayMode: 'COVER' as const });
const booking = { id: 'booking-1', customer: { name: 'Customer' }, decorationSnapshot: [] } as any;
const categories = [{ id: 'category-1', name: 'Stage' }] as any;
const items = [{ id: 'item-1', categoryId: 'category-1', name: 'Arch', isActive: true, availableQuantity: 3, totalQuantity: 3, images: [] }] as any;

const FakeCropModal: ComponentType<CustomCropModalProps> = ({ file, busy, onCancel, onConfirm }) => <div role="dialog" aria-label="Crop custom image">
  <span>{file.name}</span>
  <button type="button" disabled={busy} onClick={onCancel}>Cancel crop</button>
  <button type="button" disabled={busy} onClick={() => void onConfirm(png(`cropped-${file.name}`, 'cropped'), 'COVER')}>Confirm crop</button>
</div>;

const CropperAdapter = (props: DecorationCropperAdapterProps) => {
  return <button type="button" data-aspect={props.aspect} onClick={() => props.onCropComplete({ x: 0, y: 0, width: 4, height: 3 }, { x: 0, y: 0, width: 4, height: 3 })}>Set actual crop</button>;
};
const ActualCropModal: ComponentType<CustomCropModalProps> = (props) => <DecorationImageCropModal
  {...props}
  CropperComponent={CropperAdapter}
  exportCrop={async () => png('actual-cropped.png', 'actual-crop')}
/>;

const common = {
  booking,
  onClose() {},
  onSaved() {},
  accessToken: 'token',
  loadCategories: async () => categories,
  loadItems: async () => items,
  loadDraft: async () => null,
  materializeImage: async (file: File) => file,
  CropModal: FakeCropModal,
};

test.afterEach(() => cleanup());

test('custom Camera / gallery crops first, cancel preserves parent choices, and only cropped bytes upload', async () => {
  const uploads: File[] = [];
  const view = render(<DecorationSelectionModalContent {...common} uploadCustomImage={async (_token, _id, file) => {
    uploads.push(file);
    return uploadedImage();
  }} />);
  await page().findByText('General Notes');
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [png('camera.png')] } });
  assert.ok(await page().findByRole('dialog', { name: 'Crop custom image' }));
  assert.equal(uploads.length, 0);
  fireEvent.click(page().getByRole('button', { name: 'Cancel crop' }));
  assert.equal(page().queryByText('Custom item'), null);
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [png('gallery.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Confirm crop' }));
  await waitFor(() => assert.equal(uploads.length, 1));
  assert.equal(await uploads[0].text(), 'cropped');
  assert.equal(page().getAllByText('Title').length, 1);
  assert.ok(page().getByText('Custom item'));
  fireEvent.change(page().getByLabelText(/Title/), { target: { value: 'Preserved arch' } });
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [png('cancel-next.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Cancel crop' }));
  assert.equal((page().getByLabelText(/Title/) as HTMLInputElement).value, 'Preserved arch');
});

test('duplicate confirmation is synchronous, failed upload retains the crop for retry, and unrelated fields stay enabled', async () => {
  let resolveUpload!: (value: ReturnType<typeof uploadedImage>) => void;
  let rejectUpload!: (reason: Error) => void;
  const uploads: File[] = [];
  const view = render(<DecorationSelectionModalContent {...common} uploadCustomImage={async (_token, _id, file) => {
    uploads.push(file);
    return new Promise((resolve, reject) => { resolveUpload = resolve; rejectUpload = reject; });
  }} />);
  await page().findByText('General Notes');
  fireEvent.change(document.querySelector('input[type="file"]')!, { target: { files: [png('one.png')] } });
  const confirm = await page().findByRole('button', { name: 'Confirm crop' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  await waitFor(() => assert.equal(uploads.length, 1));
  assert.equal(page().getByText('General Notes').closest('section')?.querySelector('textarea')?.hasAttribute('disabled'), false);
  rejectUpload(new Error('offline'));
  assert.ok(await page().findByText('offline'));
  fireEvent.click(page().getByRole('button', { name: 'Confirm crop' }));
  await waitFor(() => assert.equal(uploads.length, 2));
  assert.equal(await uploads[1].text(), await uploads[0].text());
  resolveUpload(uploadedImage());
  await waitFor(() => assert.equal(page().getAllByText('Title').length, 1));
});

test('StrictMode ignores stale selection/upload completion and unmount completion', async () => {
  const selected = new Map<string, (file: File) => void>();
  const uploads: string[] = [];
  let resolveUpload!: (value: ReturnType<typeof uploadedImage>) => void;
  const view = render(<StrictMode><DecorationSelectionModalContent {...common}
    materializeImage={(file) => new Promise((resolve) => selected.set(file.name, resolve))}
    uploadCustomImage={async (_token, _id, file) => { uploads.push(file.name); return new Promise((resolve) => { resolveUpload = resolve; }); }}
  /></StrictMode>);
  await page().findByText('General Notes');
  const input = () => document.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input(), { target: { files: [png('old.png')] } });
  fireEvent.change(input(), { target: { files: [png('new.png')] } });
  await waitFor(() => assert.equal(typeof selected.get('new.png'), 'function'));
  selected.get('new.png')!(png('new.png'));
  assert.ok(await page().findByText('new.png'));
  await waitFor(() => assert.equal(typeof selected.get('old.png'), 'function'));
  selected.get('old.png')!(png('old.png'));
  await waitFor(() => assert.equal(page().queryByText('old.png'), null));
  fireEvent.click(page().getByRole('button', { name: 'Confirm crop' }));
  await waitFor(() => assert.equal(typeof selected.get('cropped-new.png'), 'function'));
  selected.get('cropped-new.png')!(png('cropped-new.png', 'cropped'));
  await waitFor(() => assert.deepEqual(uploads, ['cropped-new.png']));
  view.unmount();
  resolveUpload({ ...uploadedImage('stale'), url: 'stale' });
});

test('actual nested crop restores focus to the visible Camera / gallery trigger after cancel, Escape, and confirm', async () => {
  const uploads: File[] = [];
  const view = render(<DecorationSelectionModalContent {...common} CropModal={ActualCropModal} uploadCustomImage={async (_token, _id, file) => {
    uploads.push(file);
    return uploadedImage();
  }} />);
  await page().findByText('General Notes');
  fireEvent.click(page().getByRole('tab', { name: 'Custom Photo' }));
  const trigger = page().getByRole('button', { name: /Add Custom Photo Note/ });
  const input = document.querySelector<HTMLInputElement>('input[type="file"]')!;

  fireEvent.click(trigger);
  fireEvent.change(input, { target: { files: [png('cancel.png')] } });
  await page().findByRole('heading', { name: 'Crop image' });
  fireEvent.click(page().getByRole('button', { name: 'Cancel' }));
  await waitFor(() => assert.equal(document.activeElement, trigger));

  fireEvent.click(trigger);
  fireEvent.change(input, { target: { files: [png('escape.png')] } });
  await page().findByRole('heading', { name: 'Crop image' });
  fireEvent.keyDown(window, { key: 'Escape' });
  await waitFor(() => assert.equal(document.activeElement, trigger));

  fireEvent.click(trigger);
  fireEvent.change(input, { target: { files: [png('confirm.png')] } });
  await page().findByRole('heading', { name: 'Crop image' });
  const setCrop = page().getByRole('button', { name: 'Set actual crop' });
  assert.equal(setCrop.getAttribute('data-aspect'), String(4 / 3));
  fireEvent.click(setCrop);
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
  await waitFor(() => assert.equal(uploads.length, 1));
  await waitFor(() =>
    assert.equal(
      document.activeElement,
      page().getByRole('tab', { name: /Selected.*1/ }),
    ),
  );
  assert.equal(await uploads[0].text(), 'actual-crop');
});

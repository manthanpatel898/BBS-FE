import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { StrictMode, type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import {
  CatalogItemCard,
  ItemModal,
  type CatalogCropModalProps,
} from '../../components/decoration/settings/decoration-catalog-section';
import { DecorationImageCropModal, type DecorationCropperAdapterProps } from '../../components/decoration/decoration-image-crop-modal';

const page = () => within(document.body);
const png = (name: string, tail = 1) => new File([
  Uint8Array.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, tail]),
], name, { type: 'image/png' });

const FakeCropModal: ComponentType<CatalogCropModalProps> = ({ file, onCancel, onConfirm }) => <div role="dialog" aria-label="Crop test image">
  <span>{file.name}</span>
  <button type="button" onClick={onCancel}>Cancel crop</button>
  <button type="button" onClick={() => void onConfirm(png(`cropped-${file.name}`, 2))}>Confirm crop</button>
</div>;

const CropperAdapter = (props: DecorationCropperAdapterProps) => <button type="button" onClick={() => props.onCropComplete(
  { x: 0, y: 0, width: 4, height: 3 },
  { x: 0, y: 0, width: 4, height: 3 },
)}>Set actual crop</button>;
const ActualCropModal: ComponentType<CatalogCropModalProps> = (props) => <DecorationImageCropModal
  {...props}
  CropperComponent={CropperAdapter}
  exportCrop={async () => png('actual-cropped.png', 9)}
/>;

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
  assert.match(page().getByText('cropped-replacement.png').textContent ?? '', /cropped-replacement/);
  const replacementInput = document.querySelector<HTMLInputElement>('input[type="file"]');
  assert.ok(replacementInput);
  fireEvent.change(replacementInput, { target: { files: [png('cancelled-replacement.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Cancel crop' }));
  assert.match(page().getByText('cropped-replacement.png').textContent ?? '', /cropped-replacement/);
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

test('existing failed crop survives replacement cancel and is superseded only by a confirmed replacement', async () => {
  const uploads: string[] = [];
  const errors: string[] = [];
  const item = { id: 'one', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const view = render(<CatalogItemCard item={item} categoryName="Stage" manage token="token" onEdit={() => {}} onChanged={() => {}} onToggle={() => {}} onError={(error) => errors.push(error)} CropModal={FakeCropModal} uploadImage={async (_token, _id, file) => { uploads.push(file.name); throw new Error('offline'); }} />);
  const choose = () => view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(choose(), { target: { files: [png('first.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Confirm crop' }));
  await page().findByRole('button', { name: 'Retry image upload' });
  fireEvent.change(choose(), { target: { files: [png('second.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Cancel crop' }));
  fireEvent.click(page().getByRole('button', { name: 'Retry image upload' }));
  await waitFor(() => assert.deepEqual(uploads, ['cropped-first.png', 'cropped-first.png']));
  fireEvent.change(choose(), { target: { files: [png('second.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Confirm crop' }));
  await waitFor(() => assert.equal(uploads.at(-1), 'cropped-second.png'));
  assert.ok(errors.length);
});

test('selection generations ignore older materialization and cropped validation errors keep prior Add Item image', async () => {
  const resolutions = new Map<string, (file: File) => void>();
  const materialize = (file: File) => file.name.startsWith('cropped-') && file.name.includes('bad')
    ? Promise.reject(new Error('bad cropped bytes'))
    : new Promise<File>((resolve) => resolutions.set(file.name, resolve));
  const view = render(<ItemModal value="new" categoryId="type" onClose={() => {}} onSave={async () => {}} CropModal={FakeCropModal} materializeImage={materialize} />);
  const input = () => view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input(), { target: { files: [png('old.png')] } });
  fireEvent.change(input(), { target: { files: [png('new.png')] } });
  await act(async () => resolutions.get('new.png')!(png('new.png')));
  await page().findByText('new.png');
  await act(async () => resolutions.get('old.png')!(png('old.png')));
  await waitFor(() => assert.equal(page().queryByText('old.png'), null));
  fireEvent.click(page().getByRole('button', { name: 'Confirm crop' }));
  await act(async () => resolutions.get('cropped-new.png')!(png('cropped-new.png')));
  await page().findByText('cropped-new.png');
  fireEvent.change(input(), { target: { files: [png('bad.png')] } });
  await act(async () => resolutions.get('bad.png')!(png('bad.png')));
  await page().findByText('bad.png');
  fireEvent.click(page().getByRole('button', { name: 'Confirm crop' }));
  assert.match((await page().findByText('bad cropped bytes')).textContent ?? '', /bad cropped/);
  assert.ok(page().getByText('cropped-new.png'));
});

test('synchronous upload lock blocks duplicate confirm/retry, latest count wins, and stale completion is isolated', async () => {
  let resolveUpload!: (item: any) => void;
  const uploads: string[] = [];
  const changed: string[] = [];
  const errors: string[] = [];
  const base = { id: 'one', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const uploadImage = async (_token: string, _id: string, file: File) => { uploads.push(file.name); return new Promise<any>((resolve) => { resolveUpload = resolve; }); };
  const view = render(<CatalogItemCard item={base} categoryName="Stage" manage token="token" onEdit={() => {}} onChanged={(item) => changed.push(item.id)} onToggle={() => {}} onError={(error) => errors.push(error)} CropModal={FakeCropModal} uploadImage={uploadImage} />);
  const input = () => view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  fireEvent.change(input(), { target: { files: [png('one.png')] } });
  const confirm = await page().findByRole('button', { name: 'Confirm crop' });
  fireEvent.click(confirm); fireEvent.click(confirm);
  await waitFor(() => assert.equal(uploads.length, 1));
  view.rerender(<CatalogItemCard item={{ ...base, id: 'two' }} categoryName="Stage" manage token="token" onEdit={() => {}} onChanged={(item) => changed.push(item.id)} onToggle={() => {}} onError={(error) => errors.push(error)} CropModal={FakeCropModal} uploadImage={uploadImage} />);
  resolveUpload({ ...base, id: 'stale' });
  await waitFor(() => assert.deepEqual(changed, []));
  view.unmount();
});

test('latest 12-image count is enforced when props change while crop is open and retains crop without uploading', async () => {
  const errors: string[] = [];
  let uploads = 0;
  const base = { id: 'one', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const common = { categoryName: 'Stage', manage: true, token: 'token', onEdit() {}, onChanged() {}, onToggle() {}, onError(error: string) { errors.push(error); }, CropModal: FakeCropModal, uploadImage: async () => { uploads += 1; return base; } };
  const view = render(<CatalogItemCard item={base} {...common} />);
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [png('open.png')] } });
  await page().findByRole('dialog', { name: 'Crop test image' });
  const full = { ...base, images: Array.from({ length: 12 }, (_, i) => ({ id: String(i), url: 'x', isCover: !i })) };
  view.rerender(<CatalogItemCard item={full} {...common} />);
  fireEvent.click(page().getByRole('button', { name: 'Confirm crop' }));
  await waitFor(() => assert.ok(errors.some((error) => /12 images/i.test(error))));
  assert.equal(uploads, 0);
  assert.ok(page().getByRole('button', { name: 'Retry image upload' }));
});

test('StrictMode setup-cleanup-setup still allows async selection and crop confirmation in both workflows', async () => {
  const item = { id: 'strict', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const add = render(<StrictMode><ItemModal value="new" categoryId="type" onClose={() => {}} onSave={async () => {}} CropModal={FakeCropModal} /></StrictMode>);
  fireEvent.change(add.container.querySelector('input[type="file"]')!, { target: { files: [png('strict-add.png')] } });
  await page().findByText('strict-add.png');
  fireEvent.click(page().getByRole('button', { name: 'Confirm crop' }));
  await page().findByText('cropped-strict-add.png');
  add.unmount();

  const uploaded: string[] = [];
  const card = render(<StrictMode><CatalogItemCard item={item} categoryName="Stage" manage token="token" onEdit={() => {}} onChanged={() => {}} onError={() => {}} onToggle={() => {}} CropModal={FakeCropModal} uploadImage={async (_token, _id, file) => { uploaded.push(file.name); return item; }} /></StrictMode>);
  fireEvent.change(card.container.querySelector('input[type="file"]')!, { target: { files: [png('strict-card.png')] } });
  await page().findByText('strict-card.png');
  fireEvent.click(page().getByRole('button', { name: 'Confirm crop' }));
  await waitFor(() => assert.deepEqual(uploaded, ['cropped-strict-card.png']));
});

function renderActualAddItem() {
  const view = render(<ItemModal value="new" categoryId="type" onClose={() => {}} onSave={async () => {}} CropModal={ActualCropModal} materializeImage={async (file) => file} />);
  const choose = () => page().getByRole('button', { name: 'Camera / gallery' });
  const input = () => view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  return { view, choose, input };
}

test('actual Add Item crop restores focus after Cancel', async () => {
  const { choose, input } = renderActualAddItem();
  choose().focus();
  fireEvent.change(input(), { target: { files: [png('cancel.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Cancel' }));
  assert.equal(document.activeElement, choose());
});

test('actual Add Item crop restores focus after Escape', async () => {
  const { choose, input } = renderActualAddItem();
  choose().focus();
  fireEvent.change(input(), { target: { files: [png('escape.png')] } });
  await page().findByRole('heading', { name: 'Crop image' });
  fireEvent.keyDown(window, { key: 'Escape' });
  assert.equal(document.activeElement, choose());
});

test('actual Add Item crop restores focus after Confirm', async () => {
  const { choose, input } = renderActualAddItem();
  choose().focus();
  fireEvent.change(input(), { target: { files: [png('confirm.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Set actual crop' }));
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
  await page().findByText('actual-cropped.png');
  await act(async () => Promise.resolve());
  assert.equal(document.activeElement, page().getByRole('button', { name: 'Replace image' }));
});

test('actual catalog-card crop returns focus while a failed crop remains retryable after replacement cancel', async () => {
  const item = { id: 'focus', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const view = render(<CatalogItemCard item={item} categoryName="Stage" manage token="token" onEdit={() => {}} onChanged={() => {}} onToggle={() => {}} onError={() => {}} CropModal={ActualCropModal} materializeImage={async (file) => file} uploadImage={async () => { throw new Error('offline'); }} />);
  const trigger = () => page().getByRole('button', { name: 'Camera / gallery' });
  const input = () => view.container.querySelector<HTMLInputElement>('input[type="file"]')!;
  trigger().focus();
  fireEvent.change(input(), { target: { files: [png('first.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Set actual crop' }));
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
  await page().findByRole('button', { name: 'Retry image upload' });
  await waitFor(() => assert.equal(document.activeElement, trigger()));
  fireEvent.change(input(), { target: { files: [png('replacement.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Cancel' }));
  assert.equal(document.activeElement, trigger());
  assert.ok(page().getByRole('button', { name: 'Retry image upload' }));
});

test('pending catalog upload restores focus only after its trigger is enabled', async () => {
  let resolveUpload!: (item: any) => void;
  const item = { id: 'deferred', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const view = render(<CatalogItemCard item={item} categoryName="Stage" manage token="token" onEdit={() => {}} onChanged={() => {}} onToggle={() => {}} onError={() => {}} CropModal={ActualCropModal} materializeImage={async (file) => file} uploadImage={async () => new Promise((resolve) => { resolveUpload = resolve; })} />);
  const trigger = page().getByRole('button', { name: 'Camera / gallery' });
  trigger.focus();
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [png('pending.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Set actual crop' }));
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
  await waitFor(() => assert.equal(trigger.hasAttribute('disabled'), true));
  assert.notEqual(document.activeElement, trigger);
  resolveUpload(item);
  await waitFor(() => assert.equal(trigger.hasAttribute('disabled'), false));
  await waitFor(() => assert.equal(document.activeElement, trigger));
});

test('failed pending upload restores focus with retry retained but never steals deliberate focus', async () => {
  let rejectUpload!: (reason: Error) => void;
  const item = { id: 'failure', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const outside = document.createElement('button');
  outside.textContent = 'Outside';
  document.body.append(outside);
  const view = render(<CatalogItemCard item={item} categoryName="Stage" manage token="token" onEdit={() => {}} onChanged={() => {}} onToggle={() => {}} onError={() => {}} CropModal={ActualCropModal} materializeImage={async (file) => file} uploadImage={async () => new Promise((_resolve, reject) => { rejectUpload = reject; })} />);
  const trigger = page().getByRole('button', { name: 'Camera / gallery' });
  trigger.focus();
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [png('failure.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Set actual crop' }));
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
  await waitFor(() => assert.equal(trigger.hasAttribute('disabled'), true));
  outside.focus();
  rejectUpload(new Error('offline'));
  await page().findByRole('button', { name: 'Retry image upload' });
  await waitFor(() => assert.equal(trigger.hasAttribute('disabled'), false));
  assert.equal(document.activeElement, outside);
});

test('failed pending upload restores focus and retry completion restores it again', async () => {
  const attempts: Array<{ resolve: (item: any) => void; reject: (reason: Error) => void }> = [];
  const item = { id: 'retry-focus', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const view = render(<CatalogItemCard item={item} categoryName="Stage" manage token="token" onEdit={() => {}} onChanged={() => {}} onToggle={() => {}} onError={() => {}} CropModal={ActualCropModal} materializeImage={async (file) => file} uploadImage={async () => new Promise((resolve, reject) => attempts.push({ resolve, reject }))} />);
  const trigger = page().getByRole('button', { name: 'Camera / gallery' });
  trigger.focus();
  fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [png('retry.png')] } });
  fireEvent.click(await page().findByRole('button', { name: 'Set actual crop' }));
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
  await waitFor(() => assert.equal(attempts.length, 1));
  await act(async () => {
    attempts[0].reject(new Error('offline'));
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  const retry = await page().findByRole('button', { name: 'Retry image upload' });
  await waitFor(() => assert.equal(document.activeElement, trigger));
  fireEvent.click(retry);
  await waitFor(() => assert.equal(attempts.length, 2));
  await act(async () => {
    attempts[1].resolve(item);
    await new Promise((resolve) => setTimeout(resolve, 0));
  });
  await waitFor(() => assert.equal(document.activeElement, trigger));
});

test('deferred catalog focus restoration ignores stale item and unmount completion', async () => {
  const resolutions: Array<(item: any) => void> = [];
  const item = { id: 'one', categoryId: 'type', name: 'Arch', totalQuantity: 1, availableQuantity: 1, isActive: true, images: [] } as any;
  const common = { categoryName: 'Stage', manage: true, token: 'token', onEdit() {}, onChanged() {}, onToggle() {}, onError() {}, CropModal: ActualCropModal, materializeImage: async (file: File) => file, uploadImage: async () => new Promise<any>((resolve) => resolutions.push(resolve)) };
  const view = render(<CatalogItemCard item={item} {...common} />);
  const begin = async (name: string) => {
    fireEvent.change(view.container.querySelector('input[type="file"]')!, { target: { files: [png(name)] } });
    fireEvent.click(await page().findByRole('button', { name: 'Set actual crop' }));
    fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
    await act(async () => new Promise((resolve) => setTimeout(resolve, 0)));
  };
  await begin('stale.png');
  await waitFor(() => assert.equal(resolutions.length, 1));
  await act(async () => {
    view.rerender(<CatalogItemCard item={{ ...item, id: 'two' }} {...common} />);
    await Promise.resolve();
  });
  const currentTrigger = page().getByRole('button', { name: 'Camera / gallery' });
  await act(async () => {
    resolutions[0]({ ...item, id: 'one' });
    await Promise.resolve();
  });
  assert.notEqual(document.activeElement, currentTrigger);
  await begin('unmount.png');
  await waitFor(() => assert.equal(resolutions.length, 2));
  view.unmount();
  await act(async () => {
    resolutions[1]({ ...item, id: 'two' });
    await Promise.resolve();
  });
});

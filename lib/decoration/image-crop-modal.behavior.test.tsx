import './image-crop-test-dom.mjs';
import assert from 'node:assert/strict';
import test from 'node:test';
import React, { type ComponentType } from 'react';
import { act, cleanup, fireEvent, render, waitFor, within } from '@testing-library/react';
import {
  DecorationImageCropModal,
  type DecorationCropperAdapterProps,
} from '../../components/decoration/decoration-image-crop-modal';

const page = () => within(document.body);

let cropperProps: DecorationCropperAdapterProps;
const FakeCropper: ComponentType<DecorationCropperAdapterProps> = (props) => {
  cropperProps = props;
  return <button type="button" onClick={() => props.onCropComplete(
    { x: 1, y: 2, width: 400, height: 300 },
    { x: 1, y: 2, width: 400, height: 300 },
  )}>Set crop</button>;
};

const originalCreate = URL.createObjectURL;
const originalRevoke = URL.revokeObjectURL;
let created: string[];
let revoked: string[];

function setupUrls() {
  created = [];
  revoked = [];
  URL.createObjectURL = () => {
    const url = `blob:test-${created.length + 1}`;
    created.push(url);
    return url;
  };
  URL.revokeObjectURL = (url) => { revoked.push(String(url)); };
}

test.afterEach(() => {
  cleanup();
  document.body.innerHTML = '';
  document.body.style.overflow = '';
  URL.createObjectURL = originalCreate;
  URL.revokeObjectURL = originalRevoke;
});

test('traps focus, supports keyboard controls, cancels safely and restores viewport and focus', async () => {
  setupUrls();
  const trigger = document.createElement('button');
  document.body.append(trigger);
  trigger.focus();
  let cancels = 0;
  const view = render(<DecorationImageCropModal file={new File(['a'], 'a.jpg')} onCancel={() => { cancels += 1; }} onConfirm={() => {}} CropperComponent={FakeCropper} />);

  const close = page().getByRole('button', { name: 'Close image crop' });
  assert.equal(document.activeElement === close, true);
  assert.equal(document.body.style.overflow, 'hidden');
  assert.equal(cropperProps.aspect, 4 / 3);
  assert.equal(cropperProps.minZoom, 1);
  assert.equal(cropperProps.maxZoom, 3);
  assert.equal(cropperProps.zoomWithScroll, true);
  assert.equal(document.body.querySelectorAll('[class~="safe-pad-bottom"]').length, 1);
  const panelClasses = page().getByRole('dialog').firstElementChild?.getAttribute('class') ?? '';
  assert.match(panelClasses, /h-\[100dvh\]/);
  assert.match(panelClasses, /overflow-y-auto/);
  assert.match(page().getByTestId('decoration-crop-viewport').getAttribute('class') ?? '', /min-h-\[15rem\]/);
  fireEvent.keyDown(close, { key: 'Tab', shiftKey: true });
  const cancel = page().getByRole('button', { name: 'Cancel' });
  assert.equal(document.activeElement === cancel, true);
  fireEvent.keyDown(cancel, { key: 'Tab' });
  assert.equal(document.activeElement === close, true);

  const zoom = page().getByRole('slider', { name: 'Image zoom' });
  zoom.focus();
  fireEvent.keyDown(zoom, { key: 'ArrowRight' });
  fireEvent.change(zoom, { target: { value: '1.01' } });
  assert.ok(cropperProps.zoom > 1);
  fireEvent.click(page().getByRole('button', { name: 'Rotate image 90 degrees' }));
  assert.equal(cropperProps.rotation, 90);
  act(() => cropperProps.onCropChange({ x: 9, y: 8 }));
  fireEvent.click(page().getByRole('button', { name: 'Reset' }));
  assert.deepEqual(cropperProps.crop, { x: 0, y: 0 });
  assert.equal(cropperProps.rotation, 0);
  assert.equal(cropperProps.zoom, 1);

  fireEvent.mouseDown(page().getByRole('dialog'));
  assert.equal(cancels, 1);
  view.unmount();
  assert.equal(document.body.style.overflow, '');
  assert.equal(document.activeElement === trigger, true);
  assert.deepEqual(revoked, created);
});

test('blocks close and duplicate confirmation while exporting, then confirms once', async () => {
  setupUrls();
  let resolveExport!: (file: File) => void;
  let exports = 0;
  let confirms = 0;
  const exportCrop = () => { exports += 1; return new Promise<File>((resolve) => { resolveExport = resolve; }); };
  render(<DecorationImageCropModal file={new File(['a'], 'a.jpg')} onCancel={() => assert.fail('must not cancel')} onConfirm={() => { confirms += 1; }} CropperComponent={FakeCropper} exportCrop={exportCrop} />);
  fireEvent.click(page().getByRole('button', { name: 'Set crop' }));
  const confirm = page().getByRole('button', { name: 'Crop image' });
  fireEvent.click(confirm);
  fireEvent.click(confirm);
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.mouseDown(page().getByRole('dialog'));
  assert.equal(exports, 1);
  resolveExport(new File(['crop'], 'crop.jpg'));
  await waitFor(() => assert.equal(confirms, 1));
});

test('retains the file after export error, retries, and resets synchronously for a new file', async () => {
  setupUrls();
  let attempt = 0;
  const exportCrop = async (file: File) => {
    attempt += 1;
    if (attempt === 1) throw new Error(`bad ${file.name}`);
    return new File(['crop'], `crop-${file.name}`);
  };
  let confirmed = '';
  const props = { onCancel() {}, onConfirm(file: File) { confirmed = file.name; }, CropperComponent: FakeCropper, exportCrop };
  const view = render(<DecorationImageCropModal file={new File(['a'], 'a.jpg')} {...props} />);
  fireEvent.click(page().getByRole('button', { name: 'Set crop' }));
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
  assert.equal((await page().findByRole('alert')).textContent, 'bad a.jpg');
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));
  await waitFor(() => assert.equal(confirmed, 'crop-a.jpg'));

  view.rerender(<DecorationImageCropModal file={new File(['b'], 'b.jpg')} {...props} />);
  assert.deepEqual(cropperProps.crop, { x: 0, y: 0 });
  assert.equal(cropperProps.zoom, 1);
  assert.equal(cropperProps.rotation, 0);
  assert.equal(page().queryByRole('alert'), null);
  assert.equal(page().getByRole('button', { name: 'Crop image' }).hasAttribute('disabled'), true);
  await waitFor(() => assert.deepEqual(revoked, ['blob:test-1']));
  view.unmount();
  assert.deepEqual(revoked, created);
});

test('ignores a completed export when the selected source file has changed', async () => {
  setupUrls();
  let resolveExport!: (file: File) => void;
  let confirms = 0;
  const exportCrop = () => new Promise<File>((resolve) => { resolveExport = resolve; });
  const props = { onCancel() {}, onConfirm() { confirms += 1; }, CropperComponent: FakeCropper, exportCrop };
  const view = render(<DecorationImageCropModal file={new File(['a'], 'a.jpg')} {...props} />);
  fireEvent.click(page().getByRole('button', { name: 'Set crop' }));
  fireEvent.click(page().getByRole('button', { name: 'Crop image' }));

  view.rerender(<DecorationImageCropModal file={new File(['b'], 'b.jpg')} {...props} />);
  resolveExport(new File(['old-crop'], 'old-crop.jpg'));

  await waitFor(() => assert.equal(page().getByRole('button', { name: 'Crop image' }).hasAttribute('disabled'), true));
  assert.equal(confirms, 0);
});

test('external busy state blocks Escape, backdrop, cancel and confirm', async () => {
  setupUrls();
  let cancels = 0;
  render(<DecorationImageCropModal busy file={new File(['a'], 'a.jpg')} onCancel={() => { cancels += 1; }} onConfirm={() => assert.fail()} CropperComponent={FakeCropper} />);
  fireEvent.keyDown(window, { key: 'Escape' });
  fireEvent.mouseDown(page().getByRole('dialog'));
  assert.equal(cancels, 0);
  assert.equal(page().getByRole('button', { name: 'Cancel' }).hasAttribute('disabled'), true);
});

test('actual react-easy-crop handles mouse drag and touch pinch gestures', async () => {
  setupUrls();
  render(<DecorationImageCropModal
    file={new File(['actual'], 'actual.jpg', { type: 'image/jpeg' })}
    onCancel={() => {}}
    onConfirm={() => {}}
  />);

  const container = await waitFor(() => {
    const element = document.querySelector<HTMLElement>('.reactEasyCrop_Container');
    assert.ok(element);
    return element;
  });
  container.getBoundingClientRect = () => ({
    x: 0, y: 0, top: 0, left: 0, right: 400, bottom: 240, width: 400, height: 240,
    toJSON() { return {}; },
  });
  const image = container.querySelector<HTMLImageElement>('img');
  assert.ok(image);
  Object.defineProperties(image, {
    naturalWidth: { configurable: true, value: 800 },
    naturalHeight: { configurable: true, value: 600 },
    offsetWidth: { configurable: true, value: 400 },
    offsetHeight: { configurable: true, value: 300 },
  });
  fireEvent.load(image);
  await waitFor(() => assert.ok(document.querySelector('.reactEasyCrop_CropArea')));

  fireEvent.touchStart(container, {
    touches: [{ clientX: 100, clientY: 100 }, { clientX: 200, clientY: 100 }],
  });
  fireEvent.touchMove(document, {
    touches: [{ clientX: 75, clientY: 100 }, { clientX: 225, clientY: 100 }],
  });
  fireEvent.touchEnd(document, { touches: [] });
  await waitFor(() => assert.ok(Number((page().getByRole('slider', { name: 'Image zoom' }) as HTMLInputElement).value) > 1));

  fireEvent.mouseDown(container, { clientX: 100, clientY: 100 });
  fireEvent.mouseMove(document, { clientX: 130, clientY: 120 });
  fireEvent.mouseUp(document);
  await waitFor(() => assert.match(image.style.transform, /translate\(30px, 20px\)/));
});

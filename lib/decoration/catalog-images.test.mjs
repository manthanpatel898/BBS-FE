import test from 'node:test';
import assert from 'node:assert/strict';
import { getDecorationCoverImage, materializeDecorationImageFile, validateDecorationImageFile } from './catalog-images.ts';

const file = (type, size) => ({ type, size });
test('accepts bounded JPEG PNG and WebP files', () => {
  for (const type of ['image/jpeg', 'image/png', 'image/webp']) assert.equal(validateDecorationImageFile(file(type, 1024), 0), null);
});
test('rejects empty unsupported oversized and thirteenth images', () => {
  assert.match(validateDecorationImageFile(file('image/jpeg', 0), 0), /empty/i);
  assert.match(validateDecorationImageFile(file('image/gif', 10), 0), /jpeg, png or webp/i);
  assert.match(validateDecorationImageFile(file('image/jpeg', 8 * 1024 * 1024 + 1), 0), /8 mb/i);
  assert.match(validateDecorationImageFile(file('image/jpeg', 10), 12), /12 images/i);
});
test('selects explicit cover then first image then null', () => {
  const images = [{ id: '1', url: 'one', isCover: false }, { id: '2', url: 'two', isCover: true }];
  assert.equal(getDecorationCoverImage(images)?.id, '2');
  assert.equal(getDecorationCoverImage(images.map((image) => ({ ...image, isCover: false })))?.id, '1');
  assert.equal(getDecorationCoverImage([]), null);
});
test('materializes valid image bytes into a stable file', async () => {
  const source = new File([Uint8Array.from([0x89,0x50,0x4e,0x47,0x0d,0x0a,0x1a,0x0a,1,2,3])], 'photo.png', { type: 'image/png' });
  const stable = await materializeDecorationImageFile(source);
  assert.notEqual(stable, source);
  assert.equal(stable.name, 'photo.png');
  assert.equal(stable.size, source.size);
  assert.deepEqual(new Uint8Array(await stable.arrayBuffer()), new Uint8Array(await source.arrayBuffer()));
});
test('rejects a file whose bytes do not match its declared image type', async () => {
  const corrupt = new File([Uint8Array.from([1,2,3,4,5,6,7,8])], 'photo.png', { type: 'image/png' });
  await assert.rejects(() => materializeDecorationImageFile(corrupt), /does not contain valid png/i);
});

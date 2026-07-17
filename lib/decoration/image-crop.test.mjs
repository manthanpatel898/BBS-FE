import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCropOutput,
  createDecorationCropFilename,
  exportDecorationCrop,
  normalizeCropRotation,
} from './image-crop.ts';

test('normalizes rotation to the four supported clockwise values', () => {
  assert.deepEqual(
    [-450, -90, 0, 89, 90, 180, 270, 360, 450].map(normalizeCropRotation),
    [270, 270, 0, 90, 90, 180, 270, 0, 90],
  );
});

test('enforces 4:3, clamps the crop, and bounds output without upscaling', () => {
  const bounded = calculateCropOutput(
    { width: 4000, height: 3000 },
    { x: 3700, y: -20, width: 2000, height: 2000 },
    0,
    { width: 1600, height: 1200 },
  );
  assert.deepEqual(bounded, {
    rotation: 0,
    rotatedWidth: 4000,
    rotatedHeight: 3000,
    sourceX: 2000,
    sourceY: 0,
    sourceWidth: 2000,
    sourceHeight: 1500,
    outputWidth: 1600,
    outputHeight: 1200,
  });

  const small = calculateCropOutput(
    { width: 800, height: 600 },
    { x: 0, y: 0, width: 800, height: 600 },
    0,
    { width: 1600, height: 1200 },
  );
  assert.equal(small.outputWidth, 800);
  assert.equal(small.outputHeight, 600);
});

test('uses swapped bounds for quarter-turn rotations', () => {
  for (const rotation of [90, 270]) {
    const plan = calculateCropOutput(
      { width: 1200, height: 1600 },
      { x: 0, y: 0, width: 1600, height: 1200 },
      rotation,
      { width: 1600, height: 1200 },
    );
    assert.equal(plan.rotatedWidth, 1600);
    assert.equal(plan.rotatedHeight, 1200);
    assert.equal(plan.sourceWidth / plan.sourceHeight, 4 / 3);
  }
});

test('creates deterministic filenames with a MIME-matching extension', () => {
  assert.equal(createDecorationCropFilename('Hall Photo.final.PNG', 'image/png'), 'Hall Photo.final-cropped.png');
  assert.equal(createDecorationCropFilename('Hall Photo.final.PNG', 'image/jpeg'), 'Hall Photo.final-cropped.jpg');
  assert.equal(createDecorationCropFilename('.hidden', 'image/jpeg'), 'decoration-cropped.jpg');
});

function makeAdapters({ transparent = false, blob = new Blob(['crop']), decodeError } = {}) {
  const events = [];
  const canvases = [];
  const adapters = {
    async decodeBitmap(_file, options) {
      events.push(`decode:${options.imageOrientation}`);
      if (decodeError) throw decodeError;
      return { width: 800, height: 600, close() { events.push('bitmap-close'); } };
    },
    createCanvas(width, height) {
      const kind = canvases.length === 0 ? 'rotated' : 'output';
      const context = {
        translate() { events.push(`${kind}:translate`); },
        rotate() { events.push(`${kind}:rotate`); },
        drawImage() { events.push(`${kind}:draw`); },
        getImageData() { return { data: new Uint8ClampedArray(transparent ? [0, 0, 0, 0] : [0, 0, 0, 255]) }; },
      };
      const canvas = {
        width, height,
        getContext() { return context; },
        toBlob(callback, type, quality) { events.push(`blob:${type}:${quality ?? ''}`); callback(blob); },
        release() { events.push(`${kind}:release`); },
      };
      canvases.push(canvas);
      return canvas;
    },
  };
  return { adapters, events, canvases };
}

test('exports opaque crops as bounded JPEG and cleans up bitmap and canvases', async () => {
  const { adapters, events, canvases } = makeAdapters();
  const result = await exportDecorationCrop(
    new File(['source'], 'photo.png', { type: 'image/png' }),
    { x: 0, y: 0, width: 800, height: 600 },
    90,
    adapters,
  );
  assert.equal(result.name, 'photo-cropped.jpg');
  assert.equal(result.type, 'image/jpeg');
  assert.deepEqual([canvases[1].width, canvases[1].height], [600, 450]);
  assert.ok(events.includes('blob:image/jpeg:0.88'));
  assert.deepEqual(events.slice(-3), ['bitmap-close', 'rotated:release', 'output:release']);
});

test('preserves transparency as PNG with matching filename and MIME', async () => {
  const { adapters, events } = makeAdapters({ transparent: true });
  const result = await exportDecorationCrop(
    new File(['source'], 'overlay.webp', { type: 'image/webp' }),
    { x: 0, y: 0, width: 800, height: 600 },
    0,
    adapters,
  );
  assert.equal(result.name, 'overlay-cropped.png');
  assert.equal(result.type, 'image/png');
  assert.ok(events.includes('blob:image/png:'));
});

test('rejects invalid dimensions, decode errors, and null blobs with complete cleanup', async () => {
  const zero = makeAdapters();
  zero.adapters.decodeBitmap = async () => ({ width: 0, height: 600, close() { zero.events.push('bitmap-close'); } });
  await assert.rejects(exportDecorationCrop(new File(['x'], 'x.jpg'), { x: 0, y: 0, width: 1, height: 1 }, 0, zero.adapters), /dimensions/);
  assert.deepEqual(zero.events, ['bitmap-close']);

  const decode = makeAdapters({ decodeError: new Error('decode failed') });
  await assert.rejects(exportDecorationCrop(new File(['x'], 'x.jpg'), { x: 0, y: 0, width: 1, height: 1 }, 0, decode.adapters), /decode failed/);
  assert.equal(decode.events.some((event) => event.includes('release')), false);

  const nullBlob = makeAdapters({ blob: null });
  await assert.rejects(exportDecorationCrop(new File(['x'], 'x.jpg'), { x: 0, y: 0, width: 800, height: 600 }, 0, nullBlob.adapters), /encode/);
  assert.deepEqual(nullBlob.events.slice(-3), ['bitmap-close', 'rotated:release', 'output:release']);
});

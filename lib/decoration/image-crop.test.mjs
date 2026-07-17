import assert from 'node:assert/strict';
import test from 'node:test';
import {
  calculateCropOutput,
  createDecorationCropFilename,
  decodeDecorationBitmap,
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

test('returns integer dimensions with an exact reducible 4:3 ratio for odd and small crops', () => {
  for (const [width, height, expected] of [
    [1599, 1199, [1596, 1197]],
    [7, 5, [4, 3]],
    [4, 3, [4, 3]],
  ]) {
    const plan = calculateCropOutput(
      { width, height }, { x: 0, y: 0, width, height }, 0, { width: 1600, height: 1200 },
    );
    assert.deepEqual([plan.outputWidth, plan.outputHeight], expected);
    assert.equal(Number.isInteger(plan.outputWidth), true);
    assert.equal(plan.outputWidth / plan.outputHeight, 4 / 3);
  }
  assert.throws(() => calculateCropOutput(
    { width: 3, height: 3 }, { x: 0, y: 0, width: 3, height: 3 }, 0, { width: 1600, height: 1200 },
  ), /at least 4 x 3/);
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
      const kind = 'output';
      const context = {
        scale(...args) { events.push([`${kind}:scale`, ...args]); },
        translate(...args) { events.push([`${kind}:translate`, ...args]); },
        rotate(...args) { events.push([`${kind}:rotate`, ...args]); },
        drawImage(...args) { events.push([`${kind}:draw`, ...args.slice(1)]); },
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
  assert.equal(canvases.length, 1);
  assert.deepEqual([canvases[0].width, canvases[0].height], [0, 0]);
  assert.deepEqual(events.find((event) => Array.isArray(event) && event[0] === 'output:scale'), ['output:scale', 1, 1]);
  assert.ok(events.includes('blob:image/jpeg:0.88'));
  assert.deepEqual(events.slice(-2), ['bitmap-close', 'output:release']);
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
  assert.deepEqual(nullBlob.events.slice(-2), ['bitmap-close', 'output:release']);
});

test('maps the rotated source directly into one bounded canvas for every rotation', async () => {
  for (const [rotation, expected] of [
    [0, { translate: [400, 300], radians: 0 }],
    [90, { translate: [300, 400], radians: Math.PI / 2 }],
    [180, { translate: [400, 300], radians: Math.PI }],
    [270, { translate: [300, 400], radians: Math.PI * 1.5 }],
  ]) {
    const { adapters, events, canvases } = makeAdapters();
    await exportDecorationCrop(new File(['x'], 'x.jpg'), { x: 0, y: 0, width: 800, height: 600 }, rotation, adapters);
    assert.equal(canvases.length, 1, `rotation ${rotation}`);
    assert.deepEqual(events.find((event) => Array.isArray(event) && event[0] === 'output:translate'), ['output:translate', ...expected.translate]);
    assert.deepEqual(events.find((event) => Array.isArray(event) && event[0] === 'output:rotate'), ['output:rotate', expected.radians]);
    assert.deepEqual(events.find((event) => Array.isArray(event) && event[0] === 'output:draw'), ['output:draw', -400, -300]);
  }
});

test('cleanup failures never mask export errors and never skip later cleanup', async () => {
  const { adapters, events } = makeAdapters({ blob: null });
  adapters.decodeBitmap = async () => ({ width: 800, height: 600, close() { events.push('bitmap-close'); throw new Error('close failed'); } });
  const createCanvas = adapters.createCanvas;
  adapters.createCanvas = (...args) => {
    const canvas = createCanvas(...args);
    canvas.release = () => { events.push('output:release'); throw new Error('release failed'); };
    return canvas;
  };
  await assert.rejects(exportDecorationCrop(new File(['x'], 'x.jpg'), { x: 0, y: 0, width: 800, height: 600 }, 0, adapters), /encode/);
  assert.deepEqual(events.slice(-2), ['bitmap-close', 'output:release']);
});

test('bitmap decode falls back to an orientation-aware image element loader', async () => {
  const calls = [];
  const fallback = { width: 4, height: 3 };
  const result = await decodeDecorationBitmap(new File(['x'], 'x.jpg'), {
    createBitmap: async (_file, options) => { calls.push(options); throw new Error('unsupported options'); },
    loadImage: async () => fallback,
  });
  assert.equal(result, fallback);
  assert.deepEqual(calls, [{ imageOrientation: 'from-image' }]);
});

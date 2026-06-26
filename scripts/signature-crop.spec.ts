import { strict as assert } from 'node:assert';
import { findSignatureInkBounds } from '../lib/signature-crop';

function rgba(width: number, height: number) {
  return new Uint8ClampedArray(width * height * 4);
}

function markPixel(data: Uint8ClampedArray, width: number, x: number, y: number) {
  const index = (y * width + x) * 4;
  data[index] = 15;
  data[index + 1] = 23;
  data[index + 2] = 42;
  data[index + 3] = 255;
}

const imageData = rgba(8, 6);
markPixel(imageData, 8, 2, 1);
markPixel(imageData, 8, 5, 4);

assert.deepEqual(findSignatureInkBounds(imageData, 8, 6), {
  left: 2,
  top: 1,
  right: 5,
  bottom: 4,
  width: 4,
  height: 4,
});

assert.equal(findSignatureInkBounds(rgba(8, 6), 8, 6), null);

import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const source = await readFile(new URL('../../components/decoration/decoration-image-crop-modal.tsx', import.meta.url), 'utf8').catch(() => '');

test('crop modal owns a 4:3 accessible touch crop viewport', () => {
  assert.match(source, /<BodyPortal>/);
  assert.match(source, /useModalViewport\(requestClose, closeBlocked\)/);
  assert.match(source, /aspect=\{4 \/ 3\}/);
  assert.match(source, /minZoom=\{1\}/);
  assert.match(source, /maxZoom=\{3\}/);
  assert.match(source, /touchAction:\s*'none'/);
  assert.match(source, /aria-labelledby="decoration-crop-title"/);
  assert.match(source, /safe-pad-bottom/);
  assert.match(source, /h-\[100dvh\]/);
});

test('crop modal exposes keyboard-operable zoom, rotation, reset, cancel and confirm', () => {
  assert.match(source, /aria-label="Image zoom"/);
  assert.match(source, /min=\{1\}/);
  assert.match(source, /max=\{3\}/);
  assert.match(source, /step=\{0\.01\}/);
  assert.match(source, /setRotation\(current => \(current \+ 90\) % 360\)/);
  assert.match(source, />Reset</);
  assert.match(source, />Cancel</);
  assert.match(source, /Crop image/);
});

test('crop modal protects export, retries failures, restores focus and revokes preview once', () => {
  assert.match(source, /const closeBlocked = busy \|\| processing/);
  assert.match(source, /if \(closeBlocked\) return/);
  assert.match(source, /exportDecorationCrop\(file, cropPixels, rotation\)/);
  assert.match(source, /setError\(''\)/);
  assert.match(source, /onConfirm\(croppedFile\)/);
  assert.match(source, /URL\.revokeObjectURL\(nextSourceUrl\)/);
  assert.match(source, /returnTrigger\?\.focus\(\)/);
  assert.doesNotMatch(source, /upload/i);
});

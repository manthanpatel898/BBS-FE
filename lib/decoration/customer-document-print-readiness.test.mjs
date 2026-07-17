import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForPrintableDocument } from './customer-document-print-readiness.ts';
import { printableImageAttributes } from './customer-document-image.ts';

function pendingImage() {
  const listeners = new Map();
  return {
    complete: false,
    addEventListener(type, listener) { listeners.set(type, listener); },
    removeEventListener(type, listener) { if (listeners.get(type) === listener) listeners.delete(type); },
    emit(type) { listeners.get(type)?.(); },
    listenerCount() { return listeners.size; },
  };
}

test('print readiness waits only for images inside the marked printable root', async () => {
  const inside = pendingImage();
  const outside = pendingImage();
  const root = { querySelectorAll(selector) { assert.equal(selector, 'img'); return [inside]; } };
  let settled = false;
  const waiting = waitForPrintableDocument(root, Promise.resolve(), new AbortController().signal, { afterPaint: () => Promise.resolve() }).then((value) => { settled = value; });
  await Promise.resolve();
  assert.equal(settled, false);
  assert.equal(outside.listenerCount(), 0);
  inside.emit('load');
  await waiting;
  assert.equal(settled, true);
  assert.equal(inside.listenerCount(), 0);
});

test('print readiness removes listeners and resolves false when aborted', async () => {
  const image = pendingImage();
  const controller = new AbortController();
  const waiting = waitForPrintableDocument({ querySelectorAll: () => [image] }, Promise.resolve(), controller.signal, { afterPaint: () => Promise.resolve() });
  await Promise.resolve();
  assert.equal(image.listenerCount(), 2);
  controller.abort();
  assert.equal(await waiting, false);
  assert.equal(image.listenerCount(), 0);
});

test('printable images load eagerly even when they are below the fold', () => {
  assert.deepEqual(printableImageAttributes, {
    loading: 'eager',
    decoding: 'async',
  });
});

test('print readiness waits for the error fallback to commit and paint', async () => {
  const image = pendingImage();
  let finishPaint;
  let paintCalls = 0;
  const paint = new Promise((resolve) => { finishPaint = resolve; });
  let settled = false;
  const waiting = waitForPrintableDocument(
    { querySelectorAll: () => [image] },
    Promise.resolve(),
    new AbortController().signal,
    { afterPaint: () => { paintCalls += 1; return paint; } },
  ).then((value) => { settled = value; });

  await Promise.resolve();
  image.emit('error');
  await Promise.resolve();
  await Promise.resolve();
  assert.equal(paintCalls, 1);
  assert.equal(settled, false);
  finishPaint();
  await waiting;
  assert.equal(settled, true);
});

test('print readiness times out and cleans up images that never settle', async () => {
  const image = pendingImage();
  let timeoutCallback;
  let clearedTimer = null;
  const waiting = waitForPrintableDocument(
    { querySelectorAll: () => [image] },
    Promise.resolve(),
    new AbortController().signal,
    {
      timeoutMs: 25,
      setTimer(callback, milliseconds) {
        assert.equal(milliseconds, 25);
        timeoutCallback = callback;
        return 7;
      },
      clearTimer(timer) { clearedTimer = timer; },
      afterPaint: () => Promise.resolve(),
    },
  );

  await Promise.resolve();
  assert.equal(image.listenerCount(), 2);
  timeoutCallback();
  assert.equal(await waiting, true);
  assert.equal(image.listenerCount(), 0);
  assert.equal(clearedTimer, 7);
});

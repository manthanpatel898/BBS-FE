import assert from 'node:assert/strict';
import test from 'node:test';
import { waitForPrintableDocument } from './customer-document-print-readiness.ts';

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
  const waiting = waitForPrintableDocument(root, Promise.resolve(), new AbortController().signal).then((value) => { settled = value; });
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
  const waiting = waitForPrintableDocument({ querySelectorAll: () => [image] }, Promise.resolve(), controller.signal);
  await Promise.resolve();
  assert.equal(image.listenerCount(), 2);
  controller.abort();
  assert.equal(await waiting, false);
  assert.equal(image.listenerCount(), 0);
});

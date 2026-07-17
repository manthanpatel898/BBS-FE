import assert from 'node:assert/strict';
import test from 'node:test';
import {
  createPdfDownloadController,
  getCustomerPdfFilename,
  requestDecorationCustomerPdf,
  saveDownloadedPdf,
} from './customer-document-download.ts';
import { isSessionInvalidatingResponse } from '../auth/session-events.ts';

const response = ({ status = 200, contentType = 'application/pdf', disposition = 'attachment; filename="BBS-12.pdf"', body = '%PDF', message } = {}) => new Response(
  message ? JSON.stringify({ message }) : body,
  { status, headers: { 'Content-Type': message ? 'application/json' : contentType, 'Content-Disposition': disposition } },
);

test('binary request sends bearer auth and returns PDF bytes with a safe response filename', async () => {
  let request;
  const result = await requestDecorationCustomerPdf({
    apiUrl: 'https://api.test', accessToken: 'secret', bookingId: 'booking/a',
    fetchImpl: async (input, init) => { request = { input, init }; return response(); },
    notifySessionExpired() { assert.fail('session must remain active'); },
    shouldInvalidateSession: isSessionInvalidatingResponse,
  });
  assert.equal(request.input, 'https://api.test/decoration/bookings/booking%2Fa/customer-document.pdf');
  assert.equal(request.init.headers.Authorization, 'Bearer secret');
  assert.equal(await result.blob.text(), '%PDF');
  assert.equal(result.filename, 'BBS-12.pdf');
});

test('binary request rejects non-PDF success responses', async () => {
  await assert.rejects(requestDecorationCustomerPdf({
    apiUrl: '', accessToken: 'token', bookingId: '1', fetchImpl: async () => response({ contentType: 'text/html' }), notifySessionExpired() {}, shouldInvalidateSession: isSessionInvalidatingResponse,
  }), /invalid PDF response/);
});

test('binary request notifies for 401 and shared invalidating 403 responses only', async () => {
  for (const [status, message, expected] of [
    [401, 'Unauthorized', 1],
    [403, 'Restaurant has been deactivated', 1],
    [403, 'Restaurant subscription has expired', 1],
    [403, 'Missing permission', 0],
  ]) {
    let notifications = 0;
    await assert.rejects(requestDecorationCustomerPdf({
      apiUrl: '', accessToken: 'token', bookingId: '1', fetchImpl: async () => response({ status, message }), notifySessionExpired() { notifications += 1; },
      shouldInvalidateSession: isSessionInvalidatingResponse,
    }), new RegExp(message));
    assert.equal(notifications, expected, `${status} ${message}`);
    assert.equal(isSessionInvalidatingResponse(status, message), Boolean(expected));
  }
});

test('binary request extracts API errors and forwards abort signals', async () => {
  const controller = new AbortController();
  let observedSignal;
  await assert.rejects(requestDecorationCustomerPdf({
    apiUrl: '', accessToken: 'token', bookingId: '1', signal: controller.signal,
    fetchImpl: async (_input, init) => { observedSignal = init.signal; return response({ status: 500, message: 'PDF renderer unavailable' }); },
    notifySessionExpired() {},
    shouldInvalidateSession: isSessionInvalidatingResponse,
  }), /PDF renderer unavailable/);
  assert.equal(observedSignal, controller.signal);
});

test('customer PDF filename accepts safe headers and rejects malformed or unsafe values', () => {
  assert.equal(getCustomerPdfFilename('attachment; filename="BBS-12-decoration-proposal.pdf"'), 'BBS-12-decoration-proposal.pdf');
  assert.equal(getCustomerPdfFilename("attachment; filename*=UTF-8''BBS%2012.pdf"), 'BBS 12.pdf');
  assert.equal(getCustomerPdfFilename("attachment; filename*=UTF-8''%E0%A4%A"), 'decoration-proposal.pdf');
  assert.equal(getCustomerPdfFilename('attachment; filename="../../bad:name.pdf"'), 'bad-name.pdf');
  assert.equal(getCustomerPdfFilename('attachment; filename="proposal.txt"'), 'decoration-proposal.pdf');
});

test('download controller prevents duplicates and ignores completion after abort', async () => {
  let resolveDownload;
  let calls = 0;
  const saved = [];
  const busy = [];
  const errors = [];
  const controller = createPdfDownloadController({
    download: async () => { calls += 1; return new Promise((resolve) => { resolveDownload = resolve; }); },
    save: (value) => saved.push(value), onBusy: (value) => busy.push(value), onError: (value) => errors.push(value),
  });
  const first = controller.start();
  assert.equal(controller.start(), false);
  assert.equal(calls, 1);
  controller.abort();
  resolveDownload({ blob: new Blob(), filename: 'late.pdf' });
  await first;
  assert.deepEqual(saved, []);
  assert.deepEqual(errors, ['']);
  assert.deepEqual(busy, [false, true, false]);
});

test('replacing a booking download lifecycle clears stale error and busy state', async () => {
  const state = { busy: true, error: 'Old booking failed', saved: [] };
  let resolveOld;
  const callbacks = {
    save: (result) => state.saved.push(result.filename),
    onBusy: (busy) => { state.busy = busy; },
    onError: (error) => { state.error = error; },
  };
  const oldBooking = createPdfDownloadController({
    ...callbacks,
    download: async () => new Promise((resolve) => { resolveOld = resolve; }),
  });
  const oldRequest = oldBooking.start();
  assert.equal(oldBooking.start(), false, 'duplicate click is ignored');
  assert.equal(state.busy, true);
  oldBooking.abort();
  state.busy = true;
  state.error = 'Old booking failed';

  const newBooking = createPdfDownloadController({
    ...callbacks,
    download: async () => ({ blob: new Blob(), filename: 'new.pdf' }),
  });
  assert.deepEqual({ busy: state.busy, error: state.error }, { busy: false, error: '' });
  resolveOld({ blob: new Blob(), filename: 'old.pdf' });
  await oldRequest;
  assert.deepEqual(state.saved, [], 'aborted old booking cannot save');
  await newBooking.start();
  assert.deepEqual(state.saved, ['new.pdf']);
});

test('saveDownloadedPdf clicks a temporary link and revokes the URL even when click fails', () => {
  const operations = [];
  const originalWindow = globalThis.window;
  const originalDocument = globalThis.document;
  globalThis.window = { URL: { createObjectURL() { operations.push('create'); return 'blob:test'; }, revokeObjectURL(value) { operations.push(`revoke:${value}`); } } };
  globalThis.document = { createElement() { return { href: '', download: '', click() { operations.push('click'); }, remove() { operations.push('remove'); } }; }, body: { appendChild() { operations.push('append'); } } };
  try {
    saveDownloadedPdf({ blob: new Blob(), filename: 'proposal.pdf' });
    assert.deepEqual(operations, ['create', 'append', 'click', 'remove', 'revoke:blob:test']);
    globalThis.document.createElement = () => ({ click() { throw new Error('blocked'); }, remove() { operations.push('remove-failed'); } });
    assert.throws(() => saveDownloadedPdf({ blob: new Blob(), filename: 'proposal.pdf' }), /blocked/);
    assert.deepEqual(operations.slice(-4), ['create', 'append', 'remove-failed', 'revoke:blob:test']);
  } finally { globalThis.window = originalWindow; globalThis.document = originalDocument; }
});

import { strict as assert } from 'node:assert';
import { afterEach, test } from 'node:test';
import { JSDOM } from 'jsdom';
import {
  validateFeedbackInvitation,
} from './api';
import {
  captureFeedbackToken,
  clearFeedbackToken,
  getFeedbackToken,
} from './token-session';

const originalFetch = globalThis.fetch;

afterEach(() => {
  globalThis.fetch = originalFetch;
});

test('captures the query token in session storage and removes it from the URL', () => {
  const dom = new JSDOM('', { url: 'https://zenbooking.in/feedback?token=secret' });
  Object.defineProperty(globalThis, 'window', { value: dom.window, configurable: true });
  Object.defineProperty(globalThis, 'sessionStorage', {
    value: dom.window.sessionStorage,
    configurable: true,
  });

  assert.equal(captureFeedbackToken(new URLSearchParams(dom.window.location.search)), 'secret');
  assert.equal(getFeedbackToken(), 'secret');
  assert.equal(dom.window.location.search, '');
  clearFeedbackToken();
  assert.equal(getFeedbackToken(), null);
});

test('sends the invitation token in a header and never in the URL', async () => {
  let request: Request | null = null;
  globalThis.fetch = async (input, init) => {
    request = new Request(input, init);
    return new Response(
      JSON.stringify({ success: true, data: { status: 'READY', prefill: {} } }),
      { status: 200, headers: { 'Content-Type': 'application/json' } },
    );
  };

  await validateFeedbackInvitation('secret');
  assert.equal(request?.headers.get('X-Feedback-Token'), 'secret');
  assert.equal(request?.url.includes('secret'), false);
});

test('normalizes array validation errors', async () => {
  globalThis.fetch = async () =>
    new Response(
      JSON.stringify({ success: false, message: ['Name is required', 'Image is invalid'] }),
      { status: 400, headers: { 'Content-Type': 'application/json' } },
    );

  await assert.rejects(
    validateFeedbackInvitation('secret'),
    /Name is required\. Image is invalid/,
  );
});


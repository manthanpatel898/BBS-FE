import test from 'node:test';
import assert from 'node:assert/strict';
import { resolvePasswordResetToken } from './password-reset-token.ts';

test('uses the token hydrated by Next.js', () => {
  assert.equal(resolvePasswordResetToken('next-token', ''), 'next-token');
});

test('falls back to the browser URL for static deployments', () => {
  assert.equal(
    resolvePasswordResetToken('', 'https://zenbooking.in/forgot-password/reset/?token=browser-token'),
    'browser-token',
  );
});

test('decodes URL-encoded tokens and ignores whitespace', () => {
  assert.equal(
    resolvePasswordResetToken('  ', 'https://zenbooking.in/forgot-password/reset/?token=token%2Fwith%2Bsymbols'),
    'token/with+symbols',
  );
});

test('returns an empty token for malformed or tokenless URLs', () => {
  assert.equal(resolvePasswordResetToken('', 'not a url'), '');
  assert.equal(resolvePasswordResetToken('', 'https://zenbooking.in/forgot-password/reset/'), '');
});

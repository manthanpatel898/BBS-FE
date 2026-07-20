import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';

const pageUrl = new URL('../../app/(app)/bookings/page.tsx', import.meta.url);

test('advanced cancellation is controlled only by the restaurant feature flag', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(
    source,
    /const canUseAdvancedCancelManagement =\s*hasLegacyCancelAdvanceManagement;/,
  );
  assert.doesNotMatch(
    source,
    /hasLegacyCancelAdvanceManagement\s*\|\|\s*canManageCancelAdvance/,
  );
});

test('every cancellation requires a reason while settlement choices remain feature gated', async () => {
  const source = await readFile(pageUrl, 'utf8');

  assert.match(source, /if \(!trimmedReason\)/);
  assert.match(source, /Cancellation Reason/);
  assert.match(source, /canUseAdvancedCancelManagement && cancelPopup\.order\.advanceAmount > 0/);
  assert.match(source, /disabled=\{\s*isCancelSubmitting \|\|\s*!cancelPopup\.reason\.trim\(\)/);
});

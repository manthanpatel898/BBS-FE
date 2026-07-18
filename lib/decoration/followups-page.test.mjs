import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const page = readFileSync(
  new URL('../../app/(app)/decoration/followups/page.tsx', import.meta.url),
  'utf8',
);

test('renders the decoration follow-up workspace instead of the placeholder', () => {
  assert.doesNotMatch(page, /DecorationModulePlaceholder/);
  assert.match(page, /DecorationFollowupWorkspace/);
});

test('the workspace reuses decoration detail and follow-up modal flows', () => {
  const workspace = readFileSync(
    new URL('../../components/decoration/decoration-followup-workspace.tsx', import.meta.url),
    'utf8',
  );
  assert.match(workspace, /DecorationEventDetailModal/);
  assert.match(workspace, /DecorationFollowupModal/);
  assert.match(workspace, /fetchDecorationBookings/);
});

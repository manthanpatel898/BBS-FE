import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const source = readFileSync(new URL('../../app/(app)/audit-logs/page.tsx', import.meta.url), 'utf8');

test('audit details use one compact changed-fields section', () => {
  assert.match(source, /Changes Made/);
  assert.doesNotMatch(source, /Before Values/);
  assert.doesNotMatch(source, /After Values/);
});

test('audit details retain operational context without exposing full snapshots', () => {
  assert.match(source, /Context/);
  assert.match(source, /Entity/);
  assert.match(source, /Request/);
  assert.match(source, /buildAuditChanges/);
});


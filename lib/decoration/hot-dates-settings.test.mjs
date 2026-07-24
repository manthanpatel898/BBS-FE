import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const manager = readFileSync(
  new URL('../../components/settings/hot-dates-manager.tsx', import.meta.url),
  'utf8',
);
const settings = readFileSync(
  new URL('../../components/decoration/settings/decoration-settings.tsx', import.meta.url),
  'utf8',
);
const api = readFileSync(new URL('../auth/api.ts', import.meta.url), 'utf8');

test('shared hot date manager accepts an explicit API adapter', () => {
  assert.match(manager, /export interface HotDatesApi/);
  assert.match(manager, /api\.fetch/);
  assert.match(manager, /api\.create/);
  assert.match(manager, /api\.bulkUpload/);
});

test('event settings exposes Hot Dates through event-owned endpoints', () => {
  assert.match(settings, /id:\s*['"]hotDates['"]/);
  assert.match(settings, /decorationHotDatesApi/);
  assert.match(api, /\/decoration\/hot-dates/);
  assert.doesNotMatch(settings, /fetchHotDates\(/);
});

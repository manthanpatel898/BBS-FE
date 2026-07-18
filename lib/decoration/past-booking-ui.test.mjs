import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import test from 'node:test';

const workspace = readFileSync(
  new URL('../../components/decoration/decoration-workspace.tsx', import.meta.url),
  'utf8',
);
const sidebar = readFileSync(
  new URL('../../components/decoration/decoration-day-sidebar.tsx', import.meta.url),
  'utf8',
);
const form = readFileSync(
  new URL('../../components/decoration/decoration-inquiry-form.tsx', import.meta.url),
  'utf8',
);

test('keeps past days viewable while hiding their add inquiry action', () => {
  assert.match(workspace, /canAdd={canCreateDecorationInquiry\(overlay\.date, todayKey\)}/);
  assert.match(sidebar, /canAdd\s*\?/);
  assert.match(sidebar, /No events were recorded on this date/);
});

test('new inquiry date controls use the business-date minimum only in create mode', () => {
  assert.match(form, /mode:\s*booking\s*\?\s*'edit'\s*:\s*'create'/);
  assert.match(form, /min={!booking\s*\?\s*todayKey\s*:\s*undefined}/);
  assert.match(form, /laterDate\(todayKey,values\.startDate\)/);
});

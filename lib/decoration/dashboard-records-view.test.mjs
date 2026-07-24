import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const panel = readFileSync(
  new URL('../../components/decoration/decoration-dashboard-records-panel.tsx', import.meta.url),
  'utf8',
);

test('follow-up drilldown distinguishes taken and actionable records', () => {
  assert.match(panel, /FOLLOW UP TAKEN/);
  assert.match(panel, /TAKEN_TODAY/);
  assert.match(panel, /OVERDUE/);
  assert.match(panel, /DUE_TODAY/);
  assert.match(panel, /bg-emerald-/);
  assert.match(panel, /bg-amber-/);
});

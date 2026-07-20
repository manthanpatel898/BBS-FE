import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const dashboard = readFileSync(
  new URL('../../components/decoration/decoration-dashboard.tsx', import.meta.url),
  'utf8',
);
const panel = readFileSync(
  new URL('../../components/decoration/decoration-dashboard-records-panel.tsx', import.meta.url),
  'utf8',
);

test('dashboard cards open inline records instead of navigating away', () => {
  assert.match(dashboard, /fetchDecorationDashboardRecords/);
  assert.match(dashboard, /DecorationDashboardRecordsPanel/);
  assert.doesNotMatch(dashboard, /href=\{card\.href\}/);
});

test('records panel supports back, pagination, and booking detail', () => {
  assert.match(panel, /onBack/);
  assert.match(panel, /onPageChange/);
  assert.match(panel, /onOpenBooking/);
  assert.match(panel, /DecorationStatusBadge/);
});

test('dashboard removes duplicate financial summary and constrains mobile width', () => {
  assert.doesNotMatch(dashboard, /Package value/);
  assert.match(dashboard, /min-w-0/);
  assert.match(dashboard, /max-w-full/);
});

import assert from 'node:assert/strict';
import test from 'node:test';

import { buildAuditChanges } from './changes.ts';

test('returns only fields whose values changed', () => {
  assert.deepEqual(
    buildAuditChanges(
      { customer: { firstName: 'Rahul', phone: '9999999999' }, pax: 100, status: 'INQUIRY' },
      { customer: { firstName: 'Rahul Shah', phone: '9999999999' }, pax: 120, status: 'INQUIRY' },
      'update',
    ),
    [
      { path: 'customer.firstName', label: 'Customer First Name', before: 'Rahul', after: 'Rahul Shah' },
      { path: 'pax', label: 'Pax', before: '100', after: '120' },
    ],
  );
});

test('compares nested arrays without expanding every object', () => {
  assert.deepEqual(
    buildAuditChanges(
      { selectedMenus: [{ name: 'Soup' }] },
      { selectedMenus: [{ name: 'Soup' }, { name: 'Starter' }] },
      'update',
    ),
    [
      { path: 'selectedMenus', label: 'Selected Menus', before: '1 item · Soup', after: '2 items · Soup, Starter' },
    ],
  );
});

test('identifies named complex items when a list changes without changing its count', () => {
  assert.deepEqual(
    buildAuditChanges(
      { decorationSnapshot: [{ itemName: 'Royal Sofa', quantity: 1 }] },
      { decorationSnapshot: [{ itemName: 'Classic Sofa', quantity: 1 }] },
      'update',
    ),
    [
      {
        path: 'decorationSnapshot',
        label: 'Decoration Snapshot',
        before: '1 item · Royal Sofa',
        after: '1 item · Classic Sofa',
      },
    ],
  );
});

test('shows readable primitive arrays and suppresses unchanged arrays', () => {
  assert.deepEqual(
    buildAuditChanges(
      { halls: ['Hall 1'], tags: ['priority'] },
      { halls: ['Hall 1', 'Hall 2'], tags: ['priority'] },
      'update',
    ),
    [
      { path: 'halls', label: 'Halls', before: 'Hall 1', after: 'Hall 1, Hall 2' },
    ],
  );
});

test('excludes internal, timestamp, and secret fields from the visible diff', () => {
  assert.deepEqual(
    buildAuditChanges(
      { _id: 'one', updatedAt: '2026-08-01', token: 'old', status: 'INQUIRY' },
      { _id: 'two', updatedAt: '2026-08-02', token: 'new', status: 'CONFIRMED' },
      'update',
    ),
    [
      { path: 'status', label: 'Status', before: 'Inquiry', after: 'Confirmed' },
    ],
  );
});

test('uses a single concise lifecycle row for create and delete actions', () => {
  assert.deepEqual(buildAuditChanges(null, { name: 'New booking', status: 'INQUIRY' }, 'create'), [
    { path: '$record', label: 'Record', before: '—', after: 'Created' },
  ]);
  assert.deepEqual(buildAuditChanges({ name: 'Old booking' }, null, 'delete'), [
    { path: '$record', label: 'Record', before: 'Existing', after: 'Deleted' },
  ]);
});

test('returns no rows when update snapshots contain no meaningful changes', () => {
  assert.deepEqual(buildAuditChanges({ name: 'Same' }, { name: 'Same' }, 'update'), []);
});

test('does not mistake normal fields ending in id letters for identifier fields', () => {
  assert.deepEqual(buildAuditChanges({ paid: false }, { paid: true }, 'update'), [
    { path: 'paid', label: 'Paid', before: 'No', after: 'Yes' },
  ]);
});

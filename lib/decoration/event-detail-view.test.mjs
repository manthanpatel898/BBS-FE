import test from 'node:test';
import assert from 'node:assert/strict';
import {
  canShowCustomerDocument,
  getDecorationAdvanceRows,
  getDecorationAdvanceSummary,
  getDecorationDetailActions,
} from './event-detail-view.ts';

const all = { canEdit: true, canConfirm: true, canAddPayment: true, canManageFollowups: true, canSelectDecoration: true, canPrint: true };
const booking = (status, snapshot = []) => ({
  status,
  decorationSnapshot: snapshot,
  packageRate: 10000,
  totalCollected: 2500,
  outstandingAmount: 7500,
  payments: [],
});
const ids = (value) => getDecorationDetailActions(value, all).map((action) => action.id);

test('shows inquiry actions without selection, advance, or customer documents', () => {
  assert.deepEqual(ids(booking('INQUIRY')), ['edit', 'followup', 'confirm']);
  assert.equal(canShowCustomerDocument(booking('INQUIRY', [{ itemName: 'Sofa' }])), false);
});

test('shows choose decoration and advance after confirmation but gates documents until selection', () => {
  assert.deepEqual(ids(booking('CONFIRMED')), ['edit', 'advance', 'followup', 'choose-decoration']);
  assert.equal(canShowCustomerDocument(booking('CONFIRMED')), false);
});

test('shows view and download without print or share', () => {
  const value = booking('DECORATION_SELECTED', [{ itemName: 'Sofa' }]);
  assert.deepEqual(ids(value), ['edit', 'advance', 'followup', 'edit-decoration', 'view', 'download']);
  assert.equal(canShowCustomerDocument(value), true);
});

test('keeps cancelled and closed bookings read-only', () => {
  assert.deepEqual(ids(booking('CANCELLED', [{ itemName: 'Sofa' }])), ['view', 'download']);
  assert.deepEqual(ids(booking('CLOSED_INQUIRY')), []);
});

test('removes actions when capabilities are absent', () => {
  assert.deepEqual(getDecorationDetailActions(booking('DECORATION_SELECTED', [{ itemName: 'Sofa' }]), {
    ...all,
    canEdit: false,
    canAddPayment: false,
    canManageFollowups: false,
    canSelectDecoration: false,
    canPrint: false,
  }), []);
});

test('builds advance summary and newest-first immutable ledger rows', () => {
  const value = booking('CONFIRMED');
  value.payments = [
    { _id: 'p1', amount: 1000, mode: 'CASH', date: '2026-07-15', remark: null, recordedBy: '' },
    { _id: 'p2', amount: 1500, mode: 'UPI', date: '2026-07-17', remark: 'Reference 12', recordedBy: 'Manthan' },
  ];
  assert.deepEqual(getDecorationAdvanceSummary(value), { packageAmount: 10000, receivedAmount: 2500, outstandingAmount: 7500 });
  assert.deepEqual(getDecorationAdvanceRows(value), [
    { id: 'p2', amount: 1500, mode: 'UPI', date: '2026-07-17', remark: 'Reference 12', recordedBy: 'Manthan' },
    { id: 'p1', amount: 1000, mode: 'CASH', date: '2026-07-15', remark: '—', recordedBy: '—' },
  ]);
  assert.equal(value.payments[0]._id, 'p1');
});

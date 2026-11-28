import assert from 'node:assert/strict';
import test from 'node:test';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import {
  BookingFinancialSummary,
  SettlementHistory,
  pendingAfterPaymentDeletion,
} from './booking-financial-summary';
const money = (n: number) => `₹${n}`;
test('summary emphasizes received and paid status and suppresses zero excess', () => {
  const html = renderToStaticMarkup(
    <BookingFinancialSummary
      order={{
        grandTotal: 800,
        advanceAmount: 800,
        pendingAmount: 0,
        baseTotal: 1000,
        additionalCategoryTotal: 0,
        extrasTotal: 0,
        discountAmount: 100,
        settlementDiscountAmount: 100,
      }}
      formatCurrency={money}
    />,
  );
  for (const label of [
    'Final Bill',
    'Total Received',
    'Fully Paid',
    'Bill breakdown',
    'Original bill',
    'Cumulative settlement discount',
  ])
    assert.ok(html.includes(label));
  assert.ok(!html.includes('Excess paid'));
  assert.ok(html.includes('text-emerald-700'));
});
test('multiple settlement entries retain reason, recorder and cumulative total without permission', () => {
  const entries = [1, 2].map((n) => ({
    amount: n * 100,
    reason: `Reason ${n}`,
    recordedByName: `Staff ${n}`,
    recordedAt: '2026-11-28T10:00:00Z',
  }));
  const html = renderToStaticMarkup(
    <SettlementHistory
      entries={entries}
      total={300}
      pending={500}
      canAdd={false}
      formatCurrency={money}
      onAdd={() => {}}
    />,
  );
  for (const label of [
    'Reason 1',
    'Reason 2',
    'Staff 1',
    'Staff 2',
    '₹300',
    'text-slate-900',
  ])
    assert.ok(html.includes(label));
  assert.ok(!html.includes('Add Settlement Discount'));
});
test('eligible action stays visible and disabled when fully paid, allows further discount with history', () => {
  for (const pending of [0, 200]) {
    const html = renderToStaticMarkup(
      <SettlementHistory
        entries={[]}
        total={100}
        pending={pending}
        canAdd
        formatCurrency={money}
        onAdd={() => {}}
      />,
    );
    assert.ok(html.includes('Add Settlement Discount'));
    assert.equal(html.includes('disabled=""'), pending === 0);
    assert.equal(
      html.includes('No pending balance available to discount'),
      pending === 0,
    );
  }
});
test('deletion preview accounts for excess payments before increasing pending', () => {
  assert.equal(pendingAfterPaymentDeletion(1000, 1200, 100), 0);
  assert.equal(pendingAfterPaymentDeletion(1000, 1200, 500), 300);
  assert.equal(pendingAfterPaymentDeletion(900, 900, 200), 200);
});

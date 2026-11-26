import { strict as assert } from 'node:assert';
import { test } from 'node:test';
import { previewExpense, reportQuery } from './domain';
test('percentage edit previews against original basis instead of new event price', () => {
  assert.equal(previewExpense('PERCENTAGE', '10', 60000, true, 50000), 5000);
  assert.equal(previewExpense('PERCENTAGE', '10', 60000, true), 6000);
  assert.equal(previewExpense('PERCENTAGE', '10', 0, false), null);
  assert.equal(previewExpense('RUPEES', '800', 0, false), 800);
  assert.equal(previewExpense('PERCENTAGE', '101', 60000, true), null);
});
test('report query omits blank filters and carries page and export intent', () => {
  const query = reportQuery({ dateFrom: '2026-11-01', dateTo: '', mode: 'CASH', bookingId: '', typeId: '', page: 2 }, true);
  assert.equal(query.get('dateFrom'), '2026-11-01');
  assert.equal(query.has('dateTo'), false);
  assert.equal(query.get('export'), 'true');
  assert.equal(query.get('page'), '2');
});

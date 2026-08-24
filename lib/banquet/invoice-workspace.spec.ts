import assert from 'node:assert/strict';
import { describe, it } from 'node:test';
import {
  buildInvoiceWorkspaceQuery,
  formatInvoiceMoney,
  normalizeInvoiceWorkspaceFilters,
} from './invoice-workspace';

describe('invoice workspace helpers', () => {
  it('trims filters and omits empty query values', () => {
    const filters = normalizeInvoiceWorkspaceFilters({
      search: '  INV-42  ', status: '', invoiceFrom: '', invoiceTo: '',
      eventFrom: '', eventTo: '', sort: 'newest', page: 2, limit: 20,
    });
    assert.equal(
      buildInvoiceWorkspaceQuery(filters),
      'page=2&limit=20&search=INV-42&sort=newest',
    );
  });

  it('clamps pagination to safe values', () => {
    const filters = normalizeInvoiceWorkspaceFilters({ page: 0, limit: 999 });
    assert.equal(filters.page, 1);
    assert.equal(filters.limit, 100);
  });

  it('formats paise as Indian currency', () => {
    assert.match(formatInvoiceMoney(42184275), /4,21,842\.75/);
  });
});

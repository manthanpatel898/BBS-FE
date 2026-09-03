import assert from 'node:assert/strict';
import test from 'node:test';
import { buildQuotationPrintUrl } from './print-url';

test('builds quotation print url with order, quotation, copy type, and auto print', () => {
  assert.equal(
    buildQuotationPrintUrl({
      orderId: 'order 1',
      quotationId: 'quote/1',
      copyType: 'kitchen',
      autoPrint: true,
    }),
    '/print/quotation?orderId=order+1&quotationId=quote%2F1&copyType=kitchen&print=1',
  );
});

test('defaults quotation print url to company copy without auto print', () => {
  assert.equal(
    buildQuotationPrintUrl({ orderId: 'order-1', quotationId: 'quote-1' }),
    '/print/quotation?orderId=order-1&quotationId=quote-1&copyType=company',
  );
});

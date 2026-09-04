import assert from 'node:assert/strict';
import test from 'node:test';
import {
  QUOTATION_PRINT_CONTEXT_KEY,
  resolveQuotationPrintContext,
  serializeQuotationPrintContext,
} from './print-context';

test('resolves quotation print context from qid query params', () => {
  assert.deepEqual(
    resolveQuotationPrintContext(
      new URLSearchParams('orderId=order-1&qid=quote-1&copyType=kitchen&print=1'),
    ),
    {
      orderId: 'order-1',
      quotationId: 'quote-1',
      copyType: 'kitchen',
      autoPrint: true,
    },
  );
});

test('resolves quotation print context from legacy quotationId query param', () => {
  const params = new URLSearchParams();
  params.set('orderId', 'order-1');
  params.set('quotationId', 'quote-legacy');

  assert.equal(
    resolveQuotationPrintContext(params).quotationId,
    'quote-legacy',
  );
});

test('falls back to stored print context when query params are missing', () => {
  const stored = serializeQuotationPrintContext({
    orderId: 'order-2',
    quotationId: 'quote-2',
    copyType: 'company',
    autoPrint: false,
  });
  const storage = new Map([[QUOTATION_PRINT_CONTEXT_KEY, stored]]);

  assert.deepEqual(
    resolveQuotationPrintContext(new URLSearchParams(), {
      getItem: (key) => storage.get(key) ?? null,
    }),
    {
      orderId: 'order-2',
      quotationId: 'quote-2',
      copyType: 'company',
      autoPrint: false,
    },
  );
});

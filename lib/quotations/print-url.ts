import {
  QUOTATION_PRINT_CONTEXT_KEY,
  serializeQuotationPrintContext,
} from './print-context';

export type QuotationPrintCopyType = 'company' | 'manager' | 'customer' | 'kitchen';

export function buildQuotationPrintUrl({
  orderId,
  quotationId,
  copyType = 'company',
  autoPrint = false,
}: {
  orderId: string;
  quotationId: string;
  copyType?: QuotationPrintCopyType;
  autoPrint?: boolean;
}) {
  if (!orderId.trim() || !quotationId.trim()) {
    throw new Error('Missing quotation details.');
  }

  const params = new URLSearchParams({
    orderId: orderId.trim(),
    qid: quotationId.trim(),
    copyType,
  });
  if (autoPrint) params.set('print', '1');
  return `/print/quotation?${params.toString()}`;
}

export function rememberQuotationPrintContext(
  context: {
    orderId: string;
    quotationId: string;
    copyType?: QuotationPrintCopyType;
    autoPrint?: boolean;
  },
  storage?: Pick<Storage, 'setItem'> | null,
) {
  if (!context.orderId.trim() || !context.quotationId.trim()) return;
  storage?.setItem(
    QUOTATION_PRINT_CONTEXT_KEY,
    serializeQuotationPrintContext({
      orderId: context.orderId.trim(),
      quotationId: context.quotationId.trim(),
      copyType: context.copyType ?? 'company',
      autoPrint: Boolean(context.autoPrint),
    }),
  );
}

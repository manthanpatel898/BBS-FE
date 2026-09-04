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
    quotationId: quotationId.trim(),
    copyType,
  });
  if (autoPrint) params.set('print', '1');
  return `/print/quotation?${params.toString()}`;
}

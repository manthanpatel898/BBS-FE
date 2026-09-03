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
  const params = new URLSearchParams({
    orderId,
    quotationId,
    copyType,
  });
  if (autoPrint) params.set('print', '1');
  return `/print/quotation?${params.toString()}`;
}

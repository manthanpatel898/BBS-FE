import type { QuotationPrintCopyType } from './print-url';

export const QUOTATION_PRINT_CONTEXT_KEY = 'zenbooking:lastQuotationPrintContext';

export type QuotationPrintContext = {
  orderId: string;
  quotationId: string;
  copyType: QuotationPrintCopyType;
  autoPrint: boolean;
};

type StorageReader = Pick<Storage, 'getItem'>;

function validCopyType(value: string | null): QuotationPrintCopyType {
  return value === 'manager' || value === 'customer' || value === 'kitchen'
    ? value
    : 'company';
}

export function serializeQuotationPrintContext(context: QuotationPrintContext) {
  return JSON.stringify(context);
}

export function parseQuotationPrintContext(value: string | null): QuotationPrintContext | null {
  if (!value) return null;
  try {
    const parsed = JSON.parse(value) as Partial<QuotationPrintContext>;
    if (!parsed.orderId?.trim() || !parsed.quotationId?.trim()) return null;
    return {
      orderId: parsed.orderId.trim(),
      quotationId: parsed.quotationId.trim(),
      copyType: validCopyType(parsed.copyType ?? null),
      autoPrint: Boolean(parsed.autoPrint),
    };
  } catch {
    return null;
  }
}

export function resolveQuotationPrintContext(
  params: URLSearchParams,
  storage?: StorageReader | null,
): QuotationPrintContext {
  const orderId = params.get('orderId')?.trim() ?? '';
  const quotationId =
    params.get('qid')?.trim() || params.get('quotationId')?.trim() || '';

  if (orderId) {
    return {
      orderId,
      quotationId,
      copyType: validCopyType(params.get('copyType')),
      autoPrint: params.get('print') === '1',
    };
  }

  const stored = parseQuotationPrintContext(
    storage?.getItem(QUOTATION_PRINT_CONTEXT_KEY) ?? null,
  );
  if (stored) return stored;

  return {
    orderId: '',
    quotationId: '',
    copyType: 'company',
    autoPrint: false,
  };
}

import { getLatestReusableQuotation } from './snapshot';
import type { BanquetQuotation } from './types';

export function canAcceptQuotation(quotation: BanquetQuotation) {
  return quotation.status === 'GENERATED';
}

export function canCancelQuotation(quotation: BanquetQuotation) {
  return quotation.status === 'GENERATED' || quotation.status === 'ACCEPTED';
}

export function canConfirmFromQuotation(quotation: BanquetQuotation) {
  return quotation.status === 'ACCEPTED';
}

export function nextQuotationSelection(
  quotations: BanquetQuotation[],
  preferredQuotationId?: string | null,
) {
  if (preferredQuotationId) {
    const preferred = quotations.find((quotation) => quotation.id === preferredQuotationId);
    if (preferred && preferred.status !== 'CANCELLED' && preferred.status !== 'SUPERSEDED') {
      return preferred;
    }
  }

  return getLatestReusableQuotation(quotations);
}

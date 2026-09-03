import { authorizedRequest } from '@/lib/auth/api';
import { AppSettings } from '@/lib/auth/types';
import {
  BanquetQuotation,
  InquiryQuotationSettings,
  QuotationDraftPayload,
} from './types';

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:4000';

export function updateInquiryQuotationSettings(
  token: string,
  input: InquiryQuotationSettings,
) {
  return authorizedRequest<AppSettings>('/settings/inquiry-quotations', token, {
    method: 'PATCH',
    body: JSON.stringify(input),
  });
}

export function fetchOrderQuotations(token: string, orderId: string) {
  return authorizedRequest<BanquetQuotation[]>(
    `/orders/${encodeURIComponent(orderId)}/quotations`,
    token,
  );
}

export function fetchOrderQuotation(
  token: string,
  orderId: string,
  quotationId: string,
) {
  return authorizedRequest<BanquetQuotation>(
    `/orders/${encodeURIComponent(orderId)}/quotations/${encodeURIComponent(quotationId)}`,
    token,
  );
}

export function generateOrderQuotation(
  token: string,
  orderId: string,
  input: QuotationDraftPayload,
) {
  return authorizedRequest<BanquetQuotation>(
    `/orders/${encodeURIComponent(orderId)}/quotations`,
    token,
    { method: 'POST', body: JSON.stringify(input) },
  );
}

export function acceptOrderQuotation(token: string, orderId: string, quotationId: string) {
  return authorizedRequest<BanquetQuotation>(
    `/orders/${encodeURIComponent(orderId)}/quotations/${encodeURIComponent(quotationId)}/accept`,
    token,
    { method: 'PATCH' },
  );
}

export function cancelOrderQuotation(
  token: string,
  orderId: string,
  quotationId: string,
  reason: string,
) {
  return authorizedRequest<BanquetQuotation>(
    `/orders/${encodeURIComponent(orderId)}/quotations/${encodeURIComponent(quotationId)}/cancel`,
    token,
    { method: 'PATCH', body: JSON.stringify({ reason }) },
  );
}

export function confirmOrderFromQuotation(
  token: string,
  orderId: string,
  quotationId: string,
) {
  return authorizedRequest<{ id: string; status: string }>(
    `/orders/${encodeURIComponent(orderId)}/quotations/${encodeURIComponent(quotationId)}/confirm`,
    token,
    { method: 'POST' },
  );
}

export async function downloadOrderQuotationPdf(
  token: string,
  orderId: string,
  quotationId: string,
) {
  const response = await fetch(
    `${API_URL}/orders/${encodeURIComponent(orderId)}/quotations/${encodeURIComponent(quotationId)}/pdf`,
    { headers: { Authorization: `Bearer ${token}` } },
  );
  if (!response.ok) {
    const payload = await response.json().catch(() => null) as { message?: string | string[] } | null;
    throw new Error(Array.isArray(payload?.message) ? payload.message.join(', ') : payload?.message ?? 'Unable to download quotation.');
  }
  const disposition = response.headers.get('Content-Disposition') ?? '';
  const filenameMatch = disposition.match(/filename="?([^"]+)"?/i);
  return {
    blob: await response.blob(),
    filename: filenameMatch?.[1] ?? 'quotation.pdf',
  };
}

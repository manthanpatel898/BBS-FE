export type InvoiceWorkspaceStatus = '' | 'ISSUED' | 'CANCELLED';
export type InvoiceWorkspaceSort = 'newest' | 'oldest';

export type InvoiceWorkspaceFilters = {
  page: number;
  limit: number;
  search: string;
  status: InvoiceWorkspaceStatus;
  invoiceFrom: string;
  invoiceTo: string;
  eventFrom: string;
  eventTo: string;
  sort: InvoiceWorkspaceSort;
};

export const DEFAULT_INVOICE_WORKSPACE_FILTERS: InvoiceWorkspaceFilters = {
  page: 1,
  limit: 20,
  search: '',
  status: '',
  invoiceFrom: '',
  invoiceTo: '',
  eventFrom: '',
  eventTo: '',
  sort: 'newest',
};

export function normalizeInvoiceWorkspaceFilters(
  input: Partial<InvoiceWorkspaceFilters>,
): InvoiceWorkspaceFilters {
  return {
    ...DEFAULT_INVOICE_WORKSPACE_FILTERS,
    ...input,
    page: Math.max(1, Number(input.page) || 1),
    limit: Math.min(100, Math.max(1, Number(input.limit) || 20)),
    search: String(input.search ?? '').trim(),
    status: input.status === 'ISSUED' || input.status === 'CANCELLED' ? input.status : '',
    sort: input.sort === 'oldest' ? 'oldest' : 'newest',
  };
}

export function buildInvoiceWorkspaceQuery(filters: InvoiceWorkspaceFilters): string {
  const query = new URLSearchParams({
    page: String(filters.page),
    limit: String(filters.limit),
  });
  for (const key of ['search', 'status', 'invoiceFrom', 'invoiceTo', 'eventFrom', 'eventTo'] as const) {
    if (filters[key]) query.set(key, filters[key]);
  }
  query.set('sort', filters.sort);
  return query.toString();
}

export function formatInvoiceMoney(paise = 0): string {
  return new Intl.NumberFormat('en-IN', {
    style: 'currency', currency: 'INR', minimumFractionDigits: 2,
  }).format(paise / 100);
}

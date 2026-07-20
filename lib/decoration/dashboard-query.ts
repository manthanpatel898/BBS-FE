import type { DecorationDashboardRecordType } from '@/lib/auth/types';

export const decorationDashboardRecordTypes = [
  'today',
  'upcoming',
  'open_inquiries',
  'followups',
  'advance_received',
  'outstanding',
  'selection_pending',
] as const satisfies readonly DecorationDashboardRecordType[];

const recordTypeSet = new Set<string>(decorationDashboardRecordTypes);

export type DecorationDashboardQuery = {
  view: DecorationDashboardRecordType | null;
  page: number;
  bookingId: string | null;
};

export function parseDecorationDashboardQuery(
  params: Pick<URLSearchParams, 'get'>,
): DecorationDashboardQuery {
  const candidate = params.get('view');
  const rawPage = Number(params.get('page'));
  const bookingId = params.get('bookingId')?.trim() || null;
  return {
    view: candidate && recordTypeSet.has(candidate)
      ? candidate as DecorationDashboardRecordType
      : null,
    page: Number.isSafeInteger(rawPage) && rawPage >= 1 ? rawPage : 1,
    bookingId,
  };
}

export function decorationDashboardUrl(
  state: Partial<DecorationDashboardQuery>,
): string {
  const query = new URLSearchParams();
  if (state.view) query.set('view', state.view);
  if (state.page && state.page > 1) query.set('page', String(state.page));
  if (state.bookingId?.trim()) query.set('bookingId', state.bookingId.trim());
  const encoded = query.toString();
  return `/decoration/dashboard/${encoded ? `?${encoded}` : ''}`;
}

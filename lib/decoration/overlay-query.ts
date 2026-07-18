export type DecorationOverlayQuery = {
  date: string | null;
  bookingId: string | null;
};

const DATE_KEY = /^\d{4}-\d{2}-\d{2}$/;

function canonicalDate(value: string | null | undefined): string | null {
  const candidate = value?.trim() ?? '';
  if (!DATE_KEY.test(candidate)) return null;
  const parsed = new Date(`${candidate}T00:00:00Z`);
  return Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== candidate
    ? null
    : candidate;
}

export function readDecorationOverlayQuery(
  searchParams: Pick<URLSearchParams, 'get'>,
): DecorationOverlayQuery {
  const date = canonicalDate(searchParams.get('date'));
  const bookingId = date ? searchParams.get('bookingId')?.trim() || null : null;
  return { date, bookingId };
}

export function decorationEventsUrl(state: DecorationOverlayQuery): string {
  const date = canonicalDate(state.date);
  if (!date) return '/decoration/events/';
  const query = new URLSearchParams({ date });
  const bookingId = state.bookingId?.trim();
  if (bookingId) query.set('bookingId', bookingId);
  return `/decoration/events/?${query.toString()}`;
}

export function canonicalDecorationOverlayUrl(
  searchParams: Pick<URLSearchParams, 'get'>,
): string {
  return decorationEventsUrl(readDecorationOverlayQuery(searchParams));
}

export function isDecorationOverlayUrlCurrent(
  pathname: string,
  searchParams: Pick<URLSearchParams, 'toString'>,
  expectedUrl: string,
): boolean {
  const [expectedPath, expectedQuery = ''] = expectedUrl.split('?', 2);
  const normalizePath = (value: string) => value.replace(/\/+$/, '') || '/';
  return normalizePath(pathname) === normalizePath(expectedPath)
    && searchParams.toString() === expectedQuery;
}

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}/;

function dateKey(value: string | null | undefined) {
  if (!value) return null;
  return value.match(DATE_KEY_PATTERN)?.[0] ?? null;
}

export function banquetBusinessDate(now = new Date()) {
  const parts = new Intl.DateTimeFormat('en', {
    timeZone: 'Asia/Kolkata',
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((entry) => entry.type === type)!.value;
  return `${part('year')}-${part('month')}-${part('day')}`;
}

export function canEditBanquetBookingDetails(
  status: string,
  eventDate: string | null | undefined,
  todayKey = banquetBusinessDate(),
) {
  if (status !== 'CONFIRMED') return true;
  const eventKey = dateKey(eventDate);
  return eventKey !== null && eventKey >= todayKey;
}

export type BanquetDetailActionMode = 'FULL' | 'DOCUMENTS_ONLY';

export function banquetDetailActionMode(
  eventDate: string | null | undefined,
  todayKey = banquetBusinessDate(),
): BanquetDetailActionMode {
  const eventKey = dateKey(eventDate);
  return eventKey !== null && eventKey < todayKey
    ? 'DOCUMENTS_ONLY'
    : 'FULL';
}

const DECORATION_BUSINESS_TIME_ZONE = 'Asia/Kolkata';
const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function decorationBusinessDate(now = new Date()): string {
  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DECORATION_BUSINESS_TIME_ZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  }).formatToParts(now);
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return `${values.year}-${values.month}-${values.day}`;
}

export function canCreateDecorationInquiry(
  date: string,
  todayKey = decorationBusinessDate(),
): boolean {
  if (!DATE_KEY_PATTERN.test(date) || !DATE_KEY_PATTERN.test(todayKey)) return false;
  const parsed = new Date(`${date}T00:00:00.000Z`);
  if (Number.isNaN(parsed.getTime()) || parsed.toISOString().slice(0, 10) !== date) return false;
  return date >= todayKey;
}

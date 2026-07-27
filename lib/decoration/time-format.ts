export function formatDecorationTime(value: string): string {
  const match = /^([01]\d|2[0-3]):([0-5]\d)$/.exec(value);
  if (!match) return value;
  const hour24 = Number(match[1]);
  return `${hour24 % 12 || 12}:${match[2]} ${hour24 >= 12 ? 'PM' : 'AM'}`;
}

export function formatDecorationTimeRange(startTime: string, endTime: string): string {
  return `${formatDecorationTime(startTime)} – ${formatDecorationTime(endTime)}`;
}

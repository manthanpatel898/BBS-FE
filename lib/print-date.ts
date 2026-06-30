type PrintEventDateTimeInput = {
  eventDate?: string | null;
  startTime?: string | null;
  endTime?: string | null;
};

export function formatPrintEventDateTime(input: PrintEventDateTimeInput) {
  const date = input.eventDate ? formatSlashDate(input.eventDate) : 'Pending';
  const day = input.eventDate ? formatWeekday(input.eventDate) : null;
  const time =
    input.startTime && input.endTime
      ? `${formatTime12Hour(input.startTime)} - ${formatTime12Hour(input.endTime)}`
      : input.startTime
        ? formatTime12Hour(input.startTime)
        : input.endTime
          ? formatTime12Hour(input.endTime)
          : 'Time pending';

  return day ? `${date} | ${day} | ${time}` : `${date} | ${time}`;
}

export function formatSlashDate(value: string) {
  const date = new Date(value);
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();

  return `${day}/${month}/${year}`;
}

function formatWeekday(value: string) {
  return new Intl.DateTimeFormat('en-GB', { weekday: 'long' }).format(
    new Date(value),
  );
}

function formatTime12Hour(value: string) {
  const [hourPart, minutePart] = value.split(':').map(Number);
  const suffix = hourPart >= 12 ? 'PM' : 'AM';
  const hour = hourPart % 12 || 12;

  return `${String(hour).padStart(2, '0')}:${String(minutePart).padStart(2, '0')} ${suffix}`;
}

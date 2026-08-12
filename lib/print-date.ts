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

export function formatAdvancePaymentDateTime(
  paymentDate: string,
  createdAt?: string | null,
) {
  const date = new Date(paymentDate);
  const dateText = new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Asia/Kolkata',
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
  }).format(date);
  const captureDate = createdAt ? new Date(createdAt) : null;

  if (!captureDate || Number.isNaN(captureDate.getTime())) {
    return dateText;
  }

  const timeText = new Intl.DateTimeFormat('en-US', {
    timeZone: 'Asia/Kolkata',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(captureDate);

  return `${dateText}, ${timeText}`;
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

const TIME_PATTERN = /^([01]\d|2[0-3]):([0-5]\d)$/;

export type FoodServiceScheduleForm = {
  eventStartTime: string;
  eventEndTime: string;
  welcomeDrinkStartTime: string;
  mainCourseStartTime: string;
};

export function formatFoodServiceTime(value: string | null | undefined): string {
  const match = TIME_PATTERN.exec(value?.trim() ?? '');
  if (!match) return 'Not added';
  const hour = Number(match[1]);
  return `${hour % 12 || 12}:${match[2]} ${hour >= 12 ? 'PM' : 'AM'}`;
}

export function validateFoodServiceScheduleForm(
  input: FoodServiceScheduleForm,
): string | null {
  const eventStart = parseTime(input.eventStartTime);
  const eventEnd = parseTime(input.eventEndTime);
  if (eventStart === null || eventEnd === null || eventStart === eventEnd) {
    return 'Select a valid event start and end time first.';
  }

  const duration = eventEnd > eventStart ? eventEnd - eventStart : eventEnd + 1440 - eventStart;
  const welcomeOffset = getScheduleOffset(
    input.welcomeDrinkStartTime,
    'Welcome Drink Start Time',
    eventStart,
    duration,
  );
  if (typeof welcomeOffset === 'string') return welcomeOffset;

  const mainCourseOffset = getScheduleOffset(
    input.mainCourseStartTime,
    'Main Course Start Time',
    eventStart,
    duration,
  );
  if (typeof mainCourseOffset === 'string') return mainCourseOffset;

  if (
    welcomeOffset !== null &&
    mainCourseOffset !== null &&
    welcomeOffset > mainCourseOffset
  ) {
    return 'Welcome Drink Start Time must be earlier than or equal to Main Course Start Time.';
  }
  return null;
}

function getScheduleOffset(
  value: string,
  label: string,
  eventStart: number,
  duration: number,
): number | string | null {
  if (!value.trim()) return null;
  const minute = parseTime(value);
  if (minute === null) return `${label} must use a valid time.`;
  const offset = minute >= eventStart ? minute - eventStart : minute + 1440 - eventStart;
  return offset <= duration ? offset : `${label} must be within the event time range.`;
}

function parseTime(value: string): number | null {
  const match = TIME_PATTERN.exec(value.trim());
  return match ? Number(match[1]) * 60 + Number(match[2]) : null;
}

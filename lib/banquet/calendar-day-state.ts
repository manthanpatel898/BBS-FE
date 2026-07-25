export function getCalendarDayState(input: {
  dayKey: string;
  todayKey: string;
  selectedDayKey: string | null;
  hotDateKeys: ReadonlySet<string>;
}) {
  return {
    isToday: input.dayKey === input.todayKey,
    isSelected: input.dayKey === input.selectedDayKey,
    isHotDate: input.hotDateKeys.has(input.dayKey),
  };
}

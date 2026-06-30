export function toDateInputValue(value: Date) {
  const year = value.getFullYear();
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const day = String(value.getDate()).padStart(2, '0');

  return `${year}-${month}-${day}`;
}

export function getForwardMonthQuickRange(months: number, baseDate = new Date()) {
  const normalizedMonths = Math.max(1, Math.floor(months));
  const from = new Date(baseDate.getFullYear(), baseDate.getMonth(), 1);
  const to = new Date(
    baseDate.getFullYear(),
    baseDate.getMonth() + normalizedMonths,
    0,
  );

  return {
    from: toDateInputValue(from),
    to: toDateInputValue(to),
  };
}

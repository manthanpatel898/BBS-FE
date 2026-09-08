export const FULL_DAY_CARD_CLASS = 'border-purple-400 bg-purple-100 text-purple-900';
export const FULL_DAY_HELP = 'Full day booking blocks this hall for Breakfast, Lunch, Dinner and Evening on the selected event date. Meal packages can still be configured separately.';

export function getBookingServiceSlotOptions(enabled: boolean, currentSlot?: string | null) {
  const slots = ['Breakfast', 'Lunch', 'Dinner'];
  if (enabled || currentSlot?.trim().toLowerCase() === 'full day') slots.push('Full Day');
  return slots;
}

export function buildDayHallSlotMatrix(
  orders: Array<{ serviceSlot?: string | null; hallDetails?: string | null; status: string }>,
  hallLabels: string[],
) {
  const slots = ['Breakfast', 'Lunch', 'Dinner'];
  if (orders.some((order) => order.serviceSlot?.trim().toLowerCase() === 'evening')) slots.push('Evening');
  const halls = Array.from(new Set(hallLabels.map((hall) => hall.trim()).filter(Boolean)));
  const cellMap = new Map<string, 'confirmed' | 'full-day'>();
  const fullDayHalls = new Set<string>();
  for (const order of orders) {
    if (!['CONFIRMED', 'COMPLETED'].includes(order.status)) continue;
    const fullDay = order.serviceSlot?.trim().toLowerCase() === 'full day';
    const occupied = fullDay ? slots : slots.filter((slot) => slot.toLowerCase() === order.serviceSlot?.trim().toLowerCase());
    for (const rawHall of order.hallDetails?.split('+') ?? []) {
      const hall = halls.find((label) => label.toLowerCase() === rawHall.trim().toLowerCase());
      if (!hall) continue;
      if (fullDay) fullDayHalls.add(hall);
      for (const slot of occupied) {
        const key = `${hall}::${slot}`;
        if (fullDay || !cellMap.has(key)) cellMap.set(key, fullDay ? 'full-day' : 'confirmed');
      }
    }
  }
  return { halls, slots, cellMap, fullDayHalls };
}

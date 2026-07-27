import type { DecorationAvailabilityResult, DecorationItem } from '@/lib/auth/types';

export function applyDecorationAvailability(items: DecorationItem[], availability?: DecorationAvailabilityResult): DecorationItem[] {
  if (!availability) return items;
  const live = new Map(availability.items.map((entry) => [entry.itemId, entry]));
  return items.map((item) => live.has(item.id) ? { ...item, ...live.get(item.id)! } : item);
}

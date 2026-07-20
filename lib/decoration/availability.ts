import type { DecorationAvailabilityResult, DecorationItem } from '@/lib/auth/types';

export function applyDecorationAvailability(items: DecorationItem[], availability?: DecorationAvailabilityResult): DecorationItem[] {
  if (!availability) return items;
  const quantities = new Map(availability.items.map((entry) => [entry.itemId, entry.availableQuantity]));
  return items.map((item) => quantities.has(item.id) ? { ...item, availableQuantity: quantities.get(item.id)! } : item);
}

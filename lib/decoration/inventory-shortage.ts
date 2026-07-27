export type InventoryShortage = {
  shortageQuantity: number;
  message: string;
};

export function inventoryShortage(
  requestedQuantity: number,
  availableQuantity: number,
): InventoryShortage | null {
  const requested = Math.max(0, requestedQuantity);
  const available = Math.max(0, availableQuantity);
  const shortageQuantity = Math.max(0, requested - available);
  if (!shortageQuantity) return null;
  const availabilityVerb = available === 1 ? 'is' : 'are';
  const shortageUnit = shortageQuantity === 1 ? 'unit' : 'units';
  return {
    shortageQuantity,
    message: `Only ${available} of ${requested} units ${availabilityVerb} available for this event time. Arrange or rent ${shortageQuantity} additional ${shortageUnit}.`,
  };
}

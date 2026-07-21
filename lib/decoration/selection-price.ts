export function validateDecorationSelectionPrice(
  value: string,
  totalCollected: number,
): string | null {
  if (!value.trim()) return 'Final package price is required.';
  const amount = Number(value);
  if (!Number.isFinite(amount)) return 'Enter a valid final package price.';
  if (amount < 0) return 'Final package price must be zero or greater.';
  if (amount < totalCollected) {
    return `Final package price cannot be lower than ₹${totalCollected.toLocaleString('en-IN')} already collected.`;
  }
  return null;
}

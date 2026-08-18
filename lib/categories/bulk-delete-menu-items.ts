export function removeItemsAtIndexes(items: string[], indexes: number[]) {
  const selected = new Set(
    indexes.filter((index) => Number.isInteger(index) && index >= 0 && index < items.length),
  );
  return items.filter((_, index) => !selected.has(index));
}

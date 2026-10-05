export function toggleAllVisibleSubitems(
  selectedItems: string[],
  availableItems: string[],
) {
  const allSelected =
    availableItems.length > 0 &&
    availableItems.every((item) => selectedItems.includes(item));

  return allSelected ? [] : [...availableItems];
}

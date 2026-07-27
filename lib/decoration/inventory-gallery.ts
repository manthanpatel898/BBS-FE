import type { DecorationCategory, DecorationItem } from '@/lib/auth/types';

type InventoryImage = DecorationItem['images'][number];

const usableImage = (image: InventoryImage) =>
  Boolean(image.id && image.key?.trim() && image.url.trim());

export function getInventoryCoverImage(
  item: Pick<DecorationItem, 'images'>,
): InventoryImage | null {
  const images = item.images.filter(usableImage);
  return images.find((image) => image.isCover) ?? images[0] ?? null;
}

export function getInventoryDisabledReason(
  item: Pick<DecorationItem, 'images'>,
): 'Image required' | null {
  if (!getInventoryCoverImage(item)) return 'Image required';
  return null;
}

export function filterInventoryItems(
  items: DecorationItem[],
  categories: DecorationCategory[],
  query: string,
  categoryId: string,
): DecorationItem[] {
  const normalized = query.trim().toLocaleLowerCase();
  const categoryNames = new Map(
    categories.map((category) => [
      category.id,
      category.name.toLocaleLowerCase(),
    ]),
  );

  return items.filter((item) => {
    if (!item.isActive) return false;
    if (categoryId && item.categoryId !== categoryId) return false;
    if (!normalized) return true;
    return (
      item.name.toLocaleLowerCase().includes(normalized) ||
      (item.description ?? '').toLocaleLowerCase().includes(normalized) ||
      (categoryNames.get(item.categoryId) ?? '').includes(normalized)
    );
  });
}

export type BulkSubitemPreview = {
  accepted: string[];
  duplicates: string[];
  existing: string[];
};

const normalizedName = (value: string) => value.trim().toLocaleLowerCase();

export function parseBulkSubitems(
  rawValue: string,
  existingItems: string[],
): BulkSubitemPreview {
  const existingNames = new Set(existingItems.map(normalizedName));
  const seen = new Set<string>();
  const result: BulkSubitemPreview = {
    accepted: [],
    duplicates: [],
    existing: [],
  };

  rawValue.split(/\r?\n/).forEach((rawItem) => {
    const item = rawItem.trim();
    if (!item) return;

    const normalized = normalizedName(item);
    if (existingNames.has(normalized)) {
      result.existing.push(item);
      return;
    }
    if (seen.has(normalized)) {
      result.duplicates.push(item);
      return;
    }

    seen.add(normalized);
    result.accepted.push(item);
  });

  return result;
}

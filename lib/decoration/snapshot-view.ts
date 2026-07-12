export type SnapshotViewLine = {
  itemId?: string | null;
  categoryName?: string | null;
  itemName: string;
};

export function groupSnapshotByCategory<T extends SnapshotViewLine>(lines: T[]) {
  const groups = new Map<string, T[]>();
  for (const line of lines) {
    const category = line.categoryName?.trim() || 'Other Decoration';
    groups.set(category, [...(groups.get(category) ?? []), line]);
  }
  return groups;
}

export function safeSnapshotImage(image?: { url?: string | null } | null) {
  const url = image?.url?.trim();
  if (!url) return null;
  try {
    const parsed = new URL(url);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:' ? url : null;
  } catch {
    return null;
  }
}

export function snapshotItemKey(line: SnapshotViewLine, index: number) {
  const identity = line.itemId?.trim() || line.itemName.trim().toLowerCase().replace(/[^a-z0-9]+/g, '-') || 'custom';
  return `${identity}-${index}`;
}

export type SnapshotViewLine = {
  itemId?: string | null;
  categoryName?: string | null;
  itemName: string;
  position?: number;
};

export function orderedSnapshotLines<T extends SnapshotViewLine>(lines: T[]) {
  return lines
    .map((line, index) => ({ line, index }))
    .sort((left, right) =>
      (left.line.position ?? left.index) - (right.line.position ?? right.index)
      || left.index - right.index)
    .map(({ line }) => line);
}

export function orderedSnapshotGroups<T extends SnapshotViewLine>(lines: T[]) {
  const groups: Array<{ key: string; category: string; items: T[] }> = [];
  for (const line of orderedSnapshotLines(lines)) {
    const category = line.categoryName?.trim() || 'Other Decoration';
    const current = groups.at(-1);
    if (!current || current.category !== category) {
      groups.push({ key: `${groups.length}:${category}`, category, items: [line] });
    } else current.items.push(line);
  }
  return groups;
}

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

function normalizeHallDetailLabel(label: string) {
  return label.trim().toLowerCase();
}

export function buildHallDetailChoices(hallLabels: string[]) {
  const normalized = Array.from(
    new Set(hallLabels.map((label) => label.trim()).filter(Boolean)),
  );

  const combinationsBySize = new Map<number, string[]>();

  function visit(startIndex: number, path: string[]) {
    if (path.length > 0) {
      const current = combinationsBySize.get(path.length) ?? [];
      current.push(path.join(' + '));
      combinationsBySize.set(path.length, current);
    }

    for (let index = startIndex; index < normalized.length; index += 1) {
      visit(index + 1, [...path, normalized[index]]);
    }
  }

  visit(0, []);
  return Array.from(combinationsBySize.entries())
    .sort(([sizeA], [sizeB]) => sizeA - sizeB)
    .flatMap(([, values]) => values);
}

export function filterHiddenHallDetailChoices(
  hallLabels: string[],
  hiddenCombinations: string[],
) {
  const hidden = new Set(
    hiddenCombinations
      .map((value) => normalizeHallDetailLabel(value))
      .filter(Boolean),
  );

  return buildHallDetailChoices(hallLabels).filter(
    (value) => !hidden.has(normalizeHallDetailLabel(value)),
  );
}

type ComparableRecord = Record<string, unknown>;

function isPlainObject(value: unknown): value is ComparableRecord {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function valuesEqual(left: unknown, right: unknown) {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return JSON.stringify(left) === JSON.stringify(right);
  }
  return false;
}

export function buildChangedFields(original: ComparableRecord, current: ComparableRecord) {
  const changed: ComparableRecord = {};

  for (const [key, currentValue] of Object.entries(current)) {
    if (currentValue === undefined) continue;

    const originalValue = original?.[key];
    if (isPlainObject(currentValue) && isPlainObject(originalValue)) {
      const nestedChanges = buildChangedFields(originalValue, currentValue);
      if (Object.keys(nestedChanges).length > 0) changed[key] = nestedChanges;
      continue;
    }

    if (!valuesEqual(originalValue, currentValue)) changed[key] = currentValue;
  }

  return changed;
}

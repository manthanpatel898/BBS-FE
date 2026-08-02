export type AuditOperation = 'create' | 'read' | 'update' | 'delete';

export type AuditChange = {
  path: string;
  label: string;
  before: string;
  after: string;
};

const hiddenKeys = new Set([
  '_id',
  'id',
  '__v',
  'createdat',
  'updatedat',
  'password',
  'passwordhash',
  'token',
  'accesstoken',
  'refreshtoken',
  'currentpassword',
  'newpassword',
]);

function isRecord(value: unknown): value is Record<string, unknown> {
  return Boolean(value) && typeof value === 'object' && !Array.isArray(value);
}

function isHiddenKey(key: string) {
  const normalized = key.replace(/[^a-zA-Z0-9_]/g, '').toLowerCase();
  return hiddenKeys.has(normalized) || /(?:^|_)id$/i.test(key) || /Id$/.test(key) || /Token$/.test(key);
}

function isPrimitive(value: unknown) {
  return value === null || value === undefined || ['string', 'number', 'boolean'].includes(typeof value);
}

function valuesEqual(left: unknown, right: unknown): boolean {
  if (Object.is(left, right)) return true;
  if (Array.isArray(left) && Array.isArray(right)) {
    return left.length === right.length && left.every((value, index) => valuesEqual(value, right[index]));
  }
  if (isRecord(left) && isRecord(right)) {
    const keys = Array.from(new Set([...Object.keys(left), ...Object.keys(right)]));
    return keys.every((key) => valuesEqual(left[key], right[key]));
  }
  return false;
}

function titleCase(value: string) {
  return value
    .replace(/([a-z])([A-Z])/g, '$1 $2')
    .replace(/[._-]+/g, ' ')
    .trim()
    .replace(/\b\w/g, (character) => character.toUpperCase());
}

function formatValue(value: unknown): string {
  if (value === null || value === undefined || value === '') return '—';
  if (typeof value === 'boolean') return value ? 'Yes' : 'No';
  if (typeof value === 'number') return Number.isFinite(value) ? value.toLocaleString('en-IN') : String(value);
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return '—';
    if (/^[A-Z][A-Z0-9_ -]*$/.test(trimmed)) return titleCase(trimmed.toLowerCase());
    return trimmed;
  }
  if (Array.isArray(value)) {
    if (value.length === 0) return 'No items';
    if (value.every(isPrimitive)) return value.map(formatValue).join(', ');
    const count = `${value.length.toLocaleString('en-IN')} ${value.length === 1 ? 'item' : 'items'}`;
    const labelKeys = ['itemName', 'name', 'title', 'label', 'menuName', 'sectionTitle'];
    const labels = value
      .map((item) => {
        if (!isRecord(item)) return null;
        const key = labelKeys.find((candidate) => typeof item[candidate] === 'string' && String(item[candidate]).trim());
        return key ? String(item[key]).trim() : null;
      })
      .filter((label): label is string => Boolean(label));
    if (labels.length === 0) return count;
    const visibleLabels = labels.slice(0, 3).join(', ');
    const remaining = labels.length - 3;
    return `${count} · ${visibleLabels}${remaining > 0 ? ` +${remaining} more` : ''}`;
  }
  if (isRecord(value)) {
    const visibleFields = Object.keys(value).filter((key) => !isHiddenKey(key)).length;
    return `${visibleFields.toLocaleString('en-IN')} ${visibleFields === 1 ? 'field' : 'fields'}`;
  }
  return String(value);
}

function collectChanges(
  before: Record<string, unknown>,
  after: Record<string, unknown>,
  prefix = '',
): AuditChange[] {
  const keys = Array.from(new Set([...Object.keys(before), ...Object.keys(after)]));

  return keys.flatMap((key) => {
    if (isHiddenKey(key)) return [];

    const oldValue = before[key];
    const newValue = after[key];
    if (valuesEqual(oldValue, newValue)) return [];

    const path = prefix ? `${prefix}.${key}` : key;
    if (isRecord(oldValue) && isRecord(newValue)) {
      return collectChanges(oldValue, newValue, path);
    }

    return [{ path, label: titleCase(path), before: formatValue(oldValue), after: formatValue(newValue) }];
  });
}

export function buildAuditChanges(
  before: Record<string, unknown> | null,
  after: Record<string, unknown> | null,
  operation: AuditOperation,
): AuditChange[] {
  if (operation === 'create') {
    return [{ path: '$record', label: 'Record', before: '—', after: 'Created' }];
  }
  if (operation === 'delete') {
    return [{ path: '$record', label: 'Record', before: 'Existing', after: 'Deleted' }];
  }
  if (!before && !after) return [];
  return collectChanges(before ?? {}, after ?? {});
}

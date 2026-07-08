export const CUSTOMER_TITLE_OPTIONS = ['None', 'Mr', 'Ms', 'Mrs'] as const;

export type CustomerTitle = (typeof CUSTOMER_TITLE_OPTIONS)[number];

const titlePattern = /^(mr|ms|mrs)\.?\s+/i;

function normalizeName(value: string) {
  return value.trim().replace(/\s+/g, ' ');
}

function normalizeTitle(value: string): CustomerTitle {
  const normalized = value.replace('.', '').toLowerCase();

  if (normalized === 'mr') return 'Mr';
  if (normalized === 'ms') return 'Ms';
  if (normalized === 'mrs') return 'Mrs';

  return 'None';
}

export function parseCustomerDisplayName(value: string): {
  title: CustomerTitle;
  name: string;
} {
  const normalizedValue = normalizeName(value);
  const match = normalizedValue.match(titlePattern);

  if (!match) {
    return { title: 'None', name: normalizedValue };
  }

  return {
    title: normalizeTitle(match[1]),
    name: normalizedValue.slice(match[0].length).trim(),
  };
}

export function composeCustomerDisplayName(title: CustomerTitle, name: string) {
  const parsedName = parseCustomerDisplayName(name);
  const normalizedName = parsedName.name;

  if (title === 'None') {
    return normalizedName;
  }

  return `${title} ${normalizedName}`.trim();
}

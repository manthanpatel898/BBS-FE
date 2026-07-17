export type DecorationSettingsTab = 'profile' | 'events' | 'venues';

export function normalizeDecorationSettingsTab(value: string | null | undefined): DecorationSettingsTab {
  return value === 'events' || value === 'venues' ? value : 'profile';
}

export function parseCompanyContactNumbers(value: string): string[] {
  return [...new Set(value.split(/[\n,]+/).map((item) => item.trim()).filter(Boolean))];
}

export function validateCompanyProfile(values: { name: string; contactNumbers: string }) {
  const errors: { name?: string; contactNumbers?: string } = {};
  if (!values.name.trim()) errors.name = 'Company name is required';
  const contacts = parseCompanyContactNumbers(values.contactNumbers);
  if (!contacts.length) errors.contactNumbers = 'Add at least one contact number';
  else if (contacts.some((number) => !/^\d{10}$/.test(number))) errors.contactNumbers = 'Contact numbers must contain 10 digits';
  return errors;
}

export function normalizeConfigurationName(value: string) {
  return value.trim().replace(/\s+/g, ' ').toLocaleLowerCase('en-IN');
}

export function hasNormalizedDuplicate<T extends { name: string }>(items: T[], name: string, excludedId?: string) {
  const normalized = normalizeConfigurationName(name);
  return items.some((item) => normalizeConfigurationName(item.name) === normalized && (!excludedId || !('id' in item) || item.id !== excludedId));
}

export function activeHalls<H extends { id: string; isActive: boolean }>(venues: Array<{ id: string; halls: H[] }>, venueId: string): H[] {
  return venues.find((venue) => venue.id === venueId)?.halls.filter((hall) => hall.isActive) ?? [];
}

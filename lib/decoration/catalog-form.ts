import type { DecorationLogisticsMode, DecorationTrackingMode } from '@/lib/auth/types';

export type DecorationCategoryForm = { name: string; description: string };
export type DecorationItemForm = {
  categoryId: string; name: string; description: string; trackingMode: string;
  totalQuantity: string; maintenanceQuantity: string; units: string; logisticsMode: string;
  setupBufferMinutes: string; removalBufferMinutes: string; turnaroundBufferMinutes: string; storageNote: string;
};

export function validateDecorationCategoryForm(form: DecorationCategoryForm) {
  return form.name.trim() ? {} : { name: 'Decoration type is required.' };
}

function number(value: string) { return Number(value); }
export function parseDecorationUnits(value: string) {
  return value.split('\n').map((line) => line.trim()).filter(Boolean).map((line) => { const [code, status = 'AVAILABLE'] = line.split('|').map((part) => part.trim()); return { code, status }; });
}

export function validateDecorationItemForm(form: DecorationItemForm): Partial<Record<keyof DecorationItemForm, string>> {
  const errors: Partial<Record<keyof DecorationItemForm, string>> = {};
  const total = number(form.totalQuantity), maintenance = number(form.maintenanceQuantity);
  if (!form.categoryId) errors.categoryId = 'Decoration type is required.';
  if (!form.name.trim()) errors.name = 'Item name is required.';
  if (!Number.isInteger(total) || total < 1) errors.totalQuantity = 'Total quantity must be a positive whole number.';
  if (!Number.isInteger(maintenance) || maintenance < 0) errors.maintenanceQuantity = 'Maintenance quantity must be zero or greater.';
  else if (Number.isFinite(total) && maintenance > total) errors.maintenanceQuantity = 'Maintenance quantity cannot exceed total quantity.';
  for (const key of ['setupBufferMinutes', 'removalBufferMinutes', 'turnaroundBufferMinutes'] as const) {
    const value = number(form[key]); if (!Number.isInteger(value) || value < 0) errors[key] = 'Timing must be a whole number zero or greater.';
  }
  if (form.trackingMode === 'TAGGED') {
    const units = parseDecorationUnits(form.units), codes = units.map((unit) => unit.code.toLocaleLowerCase('en-IN'));
    if (units.length !== total) errors.units = 'Tagged unit count must match total quantity.';
    else if (codes.some((code) => !code) || new Set(codes).size !== codes.length) errors.units = 'Tagged unit codes must be present and unique.';
  }
  return errors;
}

export function buildDecorationItemPayload(form: DecorationItemForm) {
  const optional = (value: string) => value.trim() || undefined;
  return {
    categoryId: form.categoryId,
    name: form.name.trim().replace(/\s+/g, ' '),
    ...(optional(form.description) ? { description: optional(form.description) } : {}),
    trackingMode: form.trackingMode as DecorationTrackingMode,
    totalQuantity: number(form.totalQuantity),
    maintenanceQuantity: number(form.maintenanceQuantity),
    units: form.trackingMode === 'TAGGED' ? parseDecorationUnits(form.units) : [],
    logisticsMode: form.logisticsMode as DecorationLogisticsMode,
    setupBufferMinutes: number(form.setupBufferMinutes),
    removalBufferMinutes: number(form.removalBufferMinutes),
    turnaroundBufferMinutes: number(form.turnaroundBufferMinutes),
    ...(optional(form.storageNote) ? { storageNote: optional(form.storageNote) } : {}),
  };
}

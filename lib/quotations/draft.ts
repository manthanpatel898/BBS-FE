import {
  normalizeSelectedMenus,
  type AdditionalCategoryFormState,
  type SelectedMenuFormState,
} from '@/lib/bookings/additional-category-selection';
import type {
  InquiryQuotationSettings,
  QuotationDraftPayload,
} from '@/lib/quotations/types';

export type QuotationDraftInput = {
  categoryId: string;
  pax: string;
  customPricePerPlate: string;
  selectedMenus: SelectedMenuFormState[];
  menuComment: string;
  addonEntries: Array<{ id?: string; label: string; price: string }>;
  additionalCategorySelections: AdditionalCategoryFormState[];
  settings: InquiryQuotationSettings;
};

function optionalNumber(value: string): number | null {
  const trimmed = value.trim();
  if (!trimmed) return null;
  const parsed = Number(trimmed);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : null;
}

function requiredPositiveNumber(value: string): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed > 0 ? parsed : 0;
}

export function buildQuotationDraftPayload(input: QuotationDraftInput): QuotationDraftPayload {
  return {
    categoryId: input.categoryId,
    pax: requiredPositiveNumber(input.pax),
    customPricePerPlate: optionalNumber(input.customPricePerPlate),
    selectedMenus: normalizeSelectedMenus(input.selectedMenus),
    menuComment: input.menuComment.trim(),
    additionalPackages: input.additionalCategorySelections.map((selection) => ({
      categoryId: selection.categoryId,
      pax: requiredPositiveNumber(selection.pax),
      customPricePerPlate: optionalNumber(selection.customPricePerPlate),
      selectedMenus: normalizeSelectedMenus(selection.selectedMenus),
      menuComment: selection.menuComment.trim(),
      startTime: selection.startTime,
      endTime: selection.endTime,
    })),
    addonServices: input.addonEntries
      .filter((entry) => entry.label.trim() || entry.price.trim())
      .map((entry) => ({
        id: entry.id,
        label: entry.label.trim(),
        price: Number(entry.price) || 0,
      })),
    discountAmount: 0,
    taxTreatment: input.settings.taxTreatment,
    gstPercentage: input.settings.gstPercentage,
    validityDays: input.settings.validityDays,
    terms: input.settings.terms,
    paymentTerms: input.settings.paymentTerms,
    cancellationPolicy: input.settings.cancellationPolicy,
    footer: input.settings.footer,
  };
}

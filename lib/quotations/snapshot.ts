import type { AdditionalCategoryFormState } from '@/lib/bookings/additional-category-selection';
import type { BanquetQuotation, QuotationPackageSnapshot } from './types';

export type QuotationSelectionSnapshot = {
  primary: {
    categoryId: string;
    totalPerson: string;
    customPricePerPlate: string;
    selectedMenus: QuotationPackageSnapshot['menuSelections'];
    menuComment: string;
  } | null;
  additional: AdditionalCategoryFormState[];
  addonEntries: Array<{ id?: string; label: string; price: string }>;
};

function rupeesFromPaise(value: number | null | undefined): string {
  if (value === null || value === undefined) return '';
  return String(value / 100);
}

export function getLatestReusableQuotation(
  quotations: BanquetQuotation[],
): BanquetQuotation | null {
  return (
    quotations
      .filter((quotation) => quotation.status === 'GENERATED' || quotation.status === 'ACCEPTED')
      .sort((left, right) => right.version - left.version)[0] ?? null
  );
}

export function quotationToSelectionSnapshot(
  quotation: BanquetQuotation | null,
): QuotationSelectionSnapshot {
  if (!quotation) {
    return { primary: null, additional: [], addonEntries: [] };
  }
  const primaryPackage =
    quotation.packages.find((item) => item.packageType === 'PRIMARY') ?? null;

  return {
    primary: primaryPackage
      ? {
          categoryId: primaryPackage.categoryId,
          totalPerson: String(primaryPackage.pax || ''),
          customPricePerPlate: rupeesFromPaise(primaryPackage.customRatePaise),
          selectedMenus: primaryPackage.menuSelections ?? [],
          menuComment: primaryPackage.menuComment ?? '',
        }
      : null,
    additional: quotation.packages
      .filter((item) => item.packageType === 'ADDITIONAL')
      .map((item, index) => ({
        uiId: `${quotation.id}-additional-${index}`,
        categoryId: item.categoryId,
        pax: String(item.pax || ''),
        configuredPricePerPlate: item.configuredRatePaise / 100,
        customPricePerPlate: rupeesFromPaise(item.customRatePaise),
        startTime: item.startTime ?? '',
        endTime: item.endTime ?? '',
        selectedMenus: item.menuSelections ?? [],
        menuComment: item.menuComment ?? '',
      })),
    addonEntries: (quotation.addOns ?? []).map((addon) => ({
      id: addon.id ?? undefined,
      label: addon.label,
      price: String((addon.amountPaise ?? 0) / 100),
    })),
  };
}

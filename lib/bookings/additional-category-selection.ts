export type PackagePriceInput = {
  pax: string;
  configuredPrice: number;
  customPrice: string;
};

export type SelectedMenuFormState = {
  menuId: string;
  title: string;
  directItems?: string[];
  sections: Array<{ sectionTitle: string; items: string[] }>;
};

export type AdditionalCategoryFormState = {
  uiId: string;
  selectionId?: string;
  categoryId: string;
  pax: string;
  configuredPricePerPlate: number;
  customPricePerPlate: string;
  startTime: string;
  endTime: string;
  selectedMenus: SelectedMenuFormState[];
  menuComment: string;
};

export function createAdditionalCategoryFormState(): AdditionalCategoryFormState {
  return {
    uiId: crypto.randomUUID(),
    categoryId: '',
    pax: '',
    configuredPricePerPlate: 0,
    customPricePerPlate: '',
    startTime: '',
    endTime: '',
    selectedMenus: [],
    menuComment: '',
  };
}

export function addMinutesToTime(time: string, minutesToAdd: number): string {
  const match = /^(\d{2}):(\d{2})$/.exec(time);
  if (!match) return '';

  const hours = Number(match[1]);
  const minutes = Number(match[2]);
  if (hours > 23 || minutes > 59 || !Number.isFinite(minutesToAdd)) return '';

  const minutesInDay = 24 * 60;
  const total =
    ((hours * 60 + minutes + minutesToAdd) % minutesInDay + minutesInDay) %
    minutesInDay;
  return `${String(Math.floor(total / 60)).padStart(2, '0')}:${String(total % 60).padStart(2, '0')}`;
}

export function availableCategoryIds(
  categories: Array<{ id: string }>,
  primaryCategoryId: string,
  additionalSelections: Array<{ categoryId: string }>,
  currentCategoryId = '',
): string[] {
  const usedIds = new Set([
    primaryCategoryId,
    ...additionalSelections
      .map((selection) => selection.categoryId)
      .filter((categoryId) => categoryId !== currentCategoryId),
  ]);
  return categories
    .map((category) => category.id)
    .filter((categoryId) => !usedIds.has(categoryId));
}

function nonNegativeNumber(value: string | number): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

export function packageSubtotal(input: PackagePriceInput): number {
  const pax = nonNegativeNumber(input.pax);
  const effectivePrice =
    input.customPrice.trim() === ''
      ? nonNegativeNumber(input.configuredPrice)
      : nonNegativeNumber(input.customPrice);
  return pax * effectivePrice;
}

export function combinedPackageTotal(
  primary: PackagePriceInput,
  additional: PackagePriceInput[],
): number {
  return [primary, ...additional].reduce(
    (total, selection) => total + packageSubtotal(selection),
    0,
  );
}

export function normalizeSelectedMenus(
  selectedMenus: SelectedMenuFormState[],
) {
  return selectedMenus.map((menu) => ({
    menuId: menu.menuId,
    directItems: menu.directItems ?? [],
    sections: menu.sections.map((section) => ({
      sectionTitle: section.sectionTitle,
      items: section.items,
    })),
  }));
}

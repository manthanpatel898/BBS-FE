import {
  normalizeSelectedMenus,
  type AdditionalCategoryFormState,
} from './additional-category-selection';

export type MenuSelectionUpdateInput = {
  categoryId: string;
  selectedMenus: Array<{
    menuId: string;
    title: string;
    directItems?: string[];
    sections: Array<{ sectionTitle: string; items: string[] }>;
  }>;
  menuComment: string;
  addonEntries: Array<{ id?: string; label: string; price: string }>;
  customPricePerPlate: string;
  welcomeDrinkStartTime: string;
  mainCourseStartTime: string;
  enableWelcomeDrinkStartTime: boolean;
  enableMainCourseStartTime: boolean;
  additionalCategorySelections?: AdditionalCategoryFormState[];
  menuSelectionTracking?: {
    startedAt: string;
    trigger: 'initial' | 'change';
  };
};

export function buildMenuSelectionUpdatePayload(input: MenuSelectionUpdateInput) {
  return {
    categoryId: input.categoryId,
    ...(input.addonEntries.length
      ? {
          addonServices: input.addonEntries.map((entry) => ({
          id: entry.id,
          label: entry.label,
          price: Number(entry.price) || 0,
          })),
        }
      : {}),
    ...(input.customPricePerPlate.trim()
      ? { customPricePerPlate: Number(input.customPricePerPlate) }
      : {}),
    selectedMenus: normalizeSelectedMenus(input.selectedMenus),
    menuComment: input.menuComment.trim(),
    ...(input.enableWelcomeDrinkStartTime
      ? { welcomeDrinkStartTime: input.welcomeDrinkStartTime || null }
      : {}),
    ...(input.enableMainCourseStartTime
      ? { mainCourseStartTime: input.mainCourseStartTime || null }
      : {}),
    ...((input.additionalCategorySelections?.length ?? 0) > 0
      ? {
          additionalCategorySelections:
            input.additionalCategorySelections!.map((selection, index) => ({
              ...(selection.selectionId
                ? { selectionId: selection.selectionId }
                : {}),
              categoryId: selection.categoryId,
              pax: Number(selection.pax),
              customPricePerPlate:
                selection.customPricePerPlate.trim() === ''
                  ? null
                  : Number(selection.customPricePerPlate),
              serviceSlot: selection.serviceSlot,
              startTime: selection.startTime,
              endTime: selection.endTime,
              selectedMenus: normalizeSelectedMenus(selection.selectedMenus),
              menuComment: selection.menuComment.trim(),
              displayOrder: index,
            })),
        }
      : {}),
    ...(input.menuSelectionTracking
      ? { menuSelectionTracking: input.menuSelectionTracking }
      : {}),
  };
}

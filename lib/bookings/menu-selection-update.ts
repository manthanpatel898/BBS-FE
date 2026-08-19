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
    selectedMenus: input.selectedMenus.map((menu) => ({
      menuId: menu.menuId,
      directItems: menu.directItems ?? [],
      sections: menu.sections.map((section) => ({
        sectionTitle: section.sectionTitle,
        items: section.items,
      })),
    })),
    menuComment: input.menuComment.trim(),
    ...(input.enableWelcomeDrinkStartTime
      ? { welcomeDrinkStartTime: input.welcomeDrinkStartTime || null }
      : {}),
    ...(input.enableMainCourseStartTime
      ? { mainCourseStartTime: input.mainCourseStartTime || null }
      : {}),
    ...(input.menuSelectionTracking
      ? { menuSelectionTracking: input.menuSelectionTracking }
      : {}),
  };
}

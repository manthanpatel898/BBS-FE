import type { FlexibleSelectedMenu } from './flexible-menu-selection';

type CategoryConfiguration = {
  menuRules: Array<{
    menuId: string;
    menuTitle: string;
    sectionTitle: string;
    allowedItems: string[];
  }>;
  flexibleChoiceGroups?: Array<{
    menuId: string;
    menuTitle: string;
    allowedDirectItems: string[];
    submenuRules: Array<{ sectionTitle: string; allowedItems: string[] }>;
  }>;
};
export type MenuSelectionItem = {
  menuId: string;
  title: string;
  sectionTitle: string | null;
  item: string;
};
export type PendingMenuSelection = MenuSelectionItem & { key: string };
const canonical = (value: string) =>
  value.normalize('NFKC').trim().toLocaleLowerCase('en-US');
const keyFor = (item: MenuSelectionItem) =>
  JSON.stringify([item.menuId, item.title, item.sectionTitle, item.item]);

function flatten(selections: FlexibleSelectedMenu[]): MenuSelectionItem[] {
  return selections.flatMap((menu) => [
    ...(menu.directItems ?? []).map((item) => ({
      menuId: menu.menuId,
      title: menu.title,
      sectionTitle: null,
      item,
    })),
    ...menu.sections.flatMap((section) =>
      section.items.map((item) => ({
        menuId: menu.menuId,
        title: menu.title,
        sectionTitle: section.sectionTitle,
        item,
      })),
    ),
  ]);
}

function collect(items: MenuSelectionItem[]): FlexibleSelectedMenu[] {
  const menus: FlexibleSelectedMenu[] = [];
  for (const value of items) {
    // A pending fragment must retain its original title for future matching.
    // Sharing its ID with a renamed valid fragment must not rewrite provenance.
    let menu = menus.find((entry) => entry.menuId === value.menuId && entry.title === value.title);
    if (!menu) {
      menu = {
        menuId: value.menuId,
        title: value.title,
        directItems: [],
        sections: [],
      };
      menus.push(menu);
    }
    let target = menu.directItems!;
    if (value.sectionTitle !== null) {
      let section = menu.sections.find(
        (entry) => entry.sectionTitle === value.sectionTitle,
      );
      if (!section) {
        section = { sectionTitle: value.sectionTitle, items: [] };
        menu.sections.push(section);
      }
      target = section.items;
    }
    if (!target.some((item) => canonical(item) === canonical(value.item)))
      target.push(value.item);
  }
  return menus;
}

/** Pure draft reconciliation: never modifies a saved order or quotation snapshot. */
export function reconcileMenuSelections(
  selections: FlexibleSelectedMenu[],
  category: CategoryConfiguration | undefined,
) {
  const flexible = Boolean(category?.flexibleChoiceGroups?.length);
  const destinations = flexible
    ? category!.flexibleChoiceGroups!.flatMap((group) => [
        ...(group.allowedDirectItems.length
          ? [
              {
                menuId: group.menuId,
                title: group.menuTitle,
                sectionTitle: null as string | null,
                items: group.allowedDirectItems,
              },
            ]
          : []),
        ...group.submenuRules.map((section) => ({
          menuId: group.menuId,
          title: group.menuTitle,
          sectionTitle: section.sectionTitle as string | null,
          items: section.allowedItems,
        })),
      ])
    : (category?.menuRules ?? []).map((rule) => ({
        menuId: rule.menuId,
        title: rule.menuTitle,
        sectionTitle: rule.sectionTitle as string | null,
        items: rule.allowedItems,
      }));
  const options: MenuSelectionItem[] = destinations.flatMap(
    ({ items, ...destination }) =>
      items.map((item) => ({ ...destination, item })),
  );
  const valid: MenuSelectionItem[] = [];
  const pending: PendingMenuSelection[] = [];
  for (const saved of flatten(selections)) {
    // Existing standard custom menus and valid-destination add-ons are supported
    // by the API. Do not mistake those deliberate additions for stale menu IDs.
    if (
      category &&
      !flexible &&
      saved.menuId.startsWith('custom:') &&
      saved.sectionTitle !== null
    ) {
      valid.push(saved);
      continue;
    }
    const sameSection = (section: string | null) =>
      section === null
        ? saved.sectionTitle === null
        : saved.sectionTitle !== null &&
          canonical(section) === canonical(saved.sectionTitle);
    const sameId = destinations.filter(
      (destination) =>
        destination.menuId === saved.menuId &&
        sameSection(destination.sectionTitle),
    );
    if (sameId.length === 1) {
      const destination = sameId[0];
      valid.push({
        menuId: destination.menuId,
        title: destination.title,
        sectionTitle: destination.sectionTitle,
        item:
          destination.items.find(
            (item) => canonical(item) === canonical(saved.item),
          ) ?? saved.item,
      });
      continue;
    }
    const replacements = options.filter(
      (option) =>
        canonical(option.title) === canonical(saved.title) &&
        sameSection(option.sectionTitle) &&
        canonical(option.item) === canonical(saved.item),
    );
    if (sameId.length === 0 && replacements.length === 1)
      valid.push(replacements[0]);
    else pending.push({ ...saved, key: keyFor(saved) });
  }
  return {
    selections: collect([...valid, ...pending]),
    validSelections: collect(valid),
    pending,
    options,
  };
}

/** Called only by an explicit review action. null means remove this selection. */
export function resolveReviewedItem(
  selections: FlexibleSelectedMenu[],
  pending: PendingMenuSelection,
  replacement: MenuSelectionItem | null,
) {
  const remaining = flatten(selections).filter(
    (item) => keyFor(item) !== pending.key,
  );
  if (replacement) remaining.push(replacement);
  return collect(remaining);
}

export function keepPendingMenuSelections(
  visible: FlexibleSelectedMenu[],
  pending: PendingMenuSelection[],
) {
  return collect([...flatten(visible), ...pending]);
}

export function reconcileLoadedMenuSelections(selections: FlexibleSelectedMenu[], category: CategoryConfiguration | undefined, loadedCategory: CategoryConfiguration | null) {
  return category && category === loadedCategory
    ? reconcileMenuSelections(selections, category).selections
    : selections;
}

export function reconcileMenuPackage<
  T extends { categoryId: string; selectedMenus: FlexibleSelectedMenu[] },
>(draft: T, categories: Array<CategoryConfiguration & { id: string }>): T {
  return {
    ...draft,
    selectedMenus: reconcileMenuSelections(
      draft.selectedMenus,
      categories.find((category) => category.id === draft.categoryId),
    ).selections,
  };
}

export type FlexibleSelectionGroup = {
  groupId: string;
  menuId: string;
  menuTitle: string;
  includedChoices: number;
  allowedDirectItems: string[];
  submenuRules: Array<{ sectionTitle: string; allowedItems: string[] }>;
};

export type FlexibleSelectedMenu = {
  menuId: string;
  title: string;
  directItems?: string[];
  sections: Array<{ sectionTitle: string; items: string[] }>;
};

export type FlexibleAddonDestination =
  | { type: 'DIRECT' }
  | { type: 'SUBMENU'; sectionTitle: string };

const canonicalItemName = (value: string) =>
  value.normalize('NFKC').trim().toLocaleLowerCase('en-US');

export function categorySelectionMode(category: {
  menuRules?: unknown[];
  flexibleChoiceGroups?: unknown[];
}) {
  return (category.flexibleChoiceGroups?.length ?? 0) > 0
    ? ('FLEXIBLE' as const)
    : ('STANDARD' as const);
}

export function countFlexibleGroupSelection(
  group: FlexibleSelectionGroup,
  selectedMenus: FlexibleSelectedMenu[],
) {
  const selectedMenu = selectedMenus.find(
    (menu) => menu.menuId === group.menuId,
  );
  const selected =
    (selectedMenu?.directItems?.length ?? 0) +
    (selectedMenu?.sections ?? []).reduce(
      (total, section) => total + section.items.length,
      0,
    );

  return {
    selected,
    included: group.includedChoices,
    additional: Math.max(0, selected - group.includedChoices),
  };
}

export function toggleFlexibleDirectItem(
  selectedMenus: FlexibleSelectedMenu[],
  group: FlexibleSelectionGroup,
  item: string,
  checked: boolean,
) {
  const selectedMenu = selectedMenus.find(
    (menu) => menu.menuId === group.menuId,
  );
  if (!selectedMenu) {
    if (!checked) return selectedMenus;
    return [
      ...selectedMenus,
      {
        menuId: group.menuId,
        title: group.menuTitle,
        directItems: [item],
        sections: [],
      },
    ];
  }

  const directItems = checked
    ? Array.from(new Set([...(selectedMenu.directItems ?? []), item]))
    : (selectedMenu.directItems ?? []).filter(
        (selectedItem) => selectedItem !== item,
      );
  return selectedMenus
    .map((menu) =>
      menu.menuId === group.menuId ? { ...menu, directItems } : menu,
    )
    .filter(
      (menu) =>
        (menu.directItems?.length ?? 0) > 0 || menu.sections.length > 0,
    );
}

export function toggleFlexibleSubmenuItem(
  selectedMenus: FlexibleSelectedMenu[],
  group: FlexibleSelectionGroup,
  sectionTitle: string,
  item: string,
  checked: boolean,
) {
  const selectedMenu = selectedMenus.find(
    (menu) => menu.menuId === group.menuId,
  );
  if (!selectedMenu) {
    if (!checked) return selectedMenus;
    return [
      ...selectedMenus,
      {
        menuId: group.menuId,
        title: group.menuTitle,
        directItems: [],
        sections: [{ sectionTitle, items: [item] }],
      },
    ];
  }

  const existingSection = selectedMenu.sections.find(
    (section) => section.sectionTitle === sectionTitle,
  );
  let sections = selectedMenu.sections;
  if (!existingSection && checked) {
    sections = [...sections, { sectionTitle, items: [item] }];
  } else if (existingSection) {
    sections = sections
      .map((section) =>
        section.sectionTitle === sectionTitle
          ? {
              ...section,
              items: checked
                ? Array.from(new Set([...section.items, item]))
                : section.items.filter(
                    (selectedItem) => selectedItem !== item,
                  ),
            }
          : section,
      )
      .filter((section) => section.items.length > 0);
  }

  return selectedMenus
    .map((menu) =>
      menu.menuId === group.menuId ? { ...menu, sections } : menu,
    )
    .filter(
      (menu) =>
        (menu.directItems?.length ?? 0) > 0 || menu.sections.length > 0,
    );
}

export function addFlexibleAddonItem(
  selectedMenus: FlexibleSelectedMenu[],
  group: FlexibleSelectionGroup,
  destination: FlexibleAddonDestination,
  rawItem: string,
) {
  const normalizedInput = rawItem.normalize('NFKC').trim();
  if (!normalizedInput) return selectedMenus;
  const configuredItems =
    destination.type === 'DIRECT'
      ? group.allowedDirectItems
      : group.submenuRules.find(
          (rule) => rule.sectionTitle === destination.sectionTitle,
        )?.allowedItems ?? [];
  const item =
    configuredItems.find(
      (configuredItem) =>
        canonicalItemName(configuredItem) === canonicalItemName(normalizedInput),
    ) ?? normalizedInput;

  const selectedMenu = selectedMenus.find((menu) => menu.menuId === group.menuId);
  const destinationItems =
    destination.type === 'DIRECT'
      ? selectedMenu?.directItems ?? []
      : selectedMenu?.sections.find(
          (section) => section.sectionTitle === destination.sectionTitle,
        )?.items ?? [];
  if (
    destinationItems.some(
      (selectedItem) => canonicalItemName(selectedItem) === canonicalItemName(item),
    )
  ) {
    return selectedMenus;
  }

  return destination.type === 'DIRECT'
    ? toggleFlexibleDirectItem(selectedMenus, group, item, true)
    : toggleFlexibleSubmenuItem(
        selectedMenus,
        group,
        destination.sectionTitle,
        item,
        true,
      );
}

export function removeFlexibleAddonItem(
  selectedMenus: FlexibleSelectedMenu[],
  group: FlexibleSelectionGroup,
  destination: FlexibleAddonDestination,
  item: string,
) {
  return destination.type === 'DIRECT'
    ? toggleFlexibleDirectItem(selectedMenus, group, item, false)
    : toggleFlexibleSubmenuItem(
        selectedMenus,
        group,
        destination.sectionTitle,
        item,
        false,
      );
}

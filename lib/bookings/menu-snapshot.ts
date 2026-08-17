export type MenuSnapshotSection = {
  sectionTitle: string;
  items: string[];
};

export type MenuSnapshotEntry = {
  menuId: string;
  title: string;
  directItems?: string[];
  sections: MenuSnapshotSection[];
};

function cleanItems(items: string[] | undefined) {
  return (items ?? []).map((item) => item.trim()).filter(Boolean);
}

export function getRenderableMenuSections(
  menu: MenuSnapshotEntry,
): MenuSnapshotSection[] {
  const directItems = cleanItems(menu.directItems);
  const structuredSections = menu.sections
    .map((section) => ({
      sectionTitle: section.sectionTitle,
      items: cleanItems(section.items),
    }))
    .filter((section) => section.items.length > 0);

  return directItems.length > 0
    ? [{ sectionTitle: 'Menu Items', items: directItems }, ...structuredSections]
    : structuredSections;
}

export function getRenderableMenus<T extends MenuSnapshotEntry>(menus: T[]) {
  return menus.filter((menu) => getRenderableMenuSections(menu).length > 0);
}

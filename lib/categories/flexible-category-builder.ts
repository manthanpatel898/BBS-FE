import type { Category } from '@/lib/auth/types';

export type FlexibleMenuMode = 'EXISTING' | 'CREATE' | 'REVISE';

export type FlexibleSubmenuDraft = {
  id: string;
  title: string;
  items: string[];
};

export type FlexibleChoiceGroupDraft = {
  id: string;
  menuMode: FlexibleMenuMode;
  menuId: string;
  sourceMenuId: string;
  menuTitle: string;
  includedChoices: string;
  directItems: string[];
  submenus: FlexibleSubmenuDraft[];
};

export type FlexibleCategoryDraft = {
  name: string;
  pricePerPlate: string;
  description: string;
  groups: FlexibleChoiceGroupDraft[];
};

export type FlexibleCategoryPayload = {
  name: string;
  pricePerPlate: number;
  description: string | null;
  menus: Array<{
    mode: FlexibleMenuMode;
    menuId?: string;
    sourceMenuId?: string;
    clientKey?: string;
    title?: string;
    directItems?: { items: string[] };
    sections?: Array<{ sectionTitle: string; items: string[] }>;
  }>;
  groups: Array<{
    groupId: string;
    menuId?: string;
    clientKey?: string;
    includedChoices: number;
    allowedDirectItems: string[];
    submenuRules: Array<{ sectionTitle: string; allowedItems: string[] }>;
  }>;
  restaurantId?: string;
};

function id() {
  return crypto.randomUUID();
}

export function createFlexibleChoiceGroup(): FlexibleChoiceGroupDraft {
  return {
    id: id(),
    menuMode: 'CREATE',
    menuId: '',
    sourceMenuId: '',
    menuTitle: '',
    includedChoices: '1',
    directItems: [],
    submenus: [],
  };
}

export function createFlexibleCategoryDraft(): FlexibleCategoryDraft {
  return {
    name: '',
    pricePerPlate: '',
    description: '',
    groups: [createFlexibleChoiceGroup()],
  };
}

export function createFlexibleCategoryEditDraft(category: Category): FlexibleCategoryDraft {
  return {
    name: category.name,
    pricePerPlate: String(category.pricePerPlate),
    description: category.description ?? '',
    groups: (category.flexibleChoiceGroups ?? []).map((group) => ({
      id: group.groupId,
      menuMode: 'REVISE',
      menuId: '',
      sourceMenuId: group.menuId,
      menuTitle: group.menuTitle,
      includedChoices: String(group.includedChoices),
      directItems: [...group.allowedDirectItems],
      submenus: group.submenuRules.map((rule) => ({
        id: id(),
        title: rule.sectionTitle,
        items: [...rule.allowedItems],
      })),
    })),
  };
}

function clean(values: string[]) {
  return [...new Map(values.map((value) => [value.trim().toLocaleLowerCase(), value.trim()])).values()]
    .filter(Boolean);
}

export function validateFlexibleCategoryDraft(draft: FlexibleCategoryDraft) {
  const errors: Record<string, string> = {};
  if (!draft.name.trim()) errors.name = 'Category name is required.';
  if (!draft.pricePerPlate.trim() || Number(draft.pricePerPlate) < 0) {
    errors.pricePerPlate = 'Enter a valid price per plate.';
  }
  if (!draft.groups.length) errors.groups = 'Add at least one menu choice group.';

  const menuKeys = new Set<string>();
  for (const group of draft.groups) {
    const key = group.menuMode === 'EXISTING' ? group.menuId : group.menuTitle.trim().toLocaleLowerCase();
    const visibleCount = clean(group.directItems).length + group.submenus.reduce(
      (total, submenu) => total + clean(submenu.items).length,
      0,
    );
    const included = Number(group.includedChoices);
    if (!key) errors[group.id] = group.menuMode === 'EXISTING' ? 'Select a menu.' : 'Enter a menu name.';
    else if (group.menuMode === 'REVISE' && !group.sourceMenuId) errors[group.id] = 'The source menu is missing. Close and reopen this category.';
    else if (menuKeys.has(key)) errors[group.id] = 'Each menu can be added only once.';
    else if (visibleCount < 1) errors[group.id] = 'Add at least one direct or submenu item.';
    else if (!Number.isInteger(included) || included < 1) errors[group.id] = 'Included choices must be at least 1.';
    else if (included > visibleCount) errors[group.id] = `Included choices cannot exceed ${visibleCount} visible items.`;
    menuKeys.add(key);
  }
  return { isValid: Object.keys(errors).length === 0, errors };
}

export function buildFlexibleCategoryPayload(draft: FlexibleCategoryDraft): FlexibleCategoryPayload {
  const menus = draft.groups.map((group) => {
    if (group.menuMode === 'EXISTING') {
      return { mode: 'EXISTING' as const, menuId: group.menuId };
    }
    return {
          mode: group.menuMode,
          ...(group.menuMode === 'REVISE' ? { sourceMenuId: group.sourceMenuId } : {}),
          clientKey: group.id,
          title: group.menuTitle.trim(),
          directItems: { items: clean(group.directItems) },
          sections: group.submenus
            .map((submenu) => ({ sectionTitle: submenu.title.trim(), items: clean(submenu.items) }))
            .filter((submenu) => submenu.sectionTitle && submenu.items.length),
        };
  });
  const groups = draft.groups.map((group) => ({
    groupId: group.id,
    ...(group.menuMode === 'EXISTING' ? { menuId: group.menuId } : { clientKey: group.id }),
    includedChoices: Number(group.includedChoices),
    allowedDirectItems: clean(group.directItems),
    submenuRules: group.submenus
      .map((submenu) => ({ sectionTitle: submenu.title.trim(), allowedItems: clean(submenu.items) }))
      .filter((submenu) => submenu.sectionTitle && submenu.allowedItems.length),
  }));
  return {
    name: draft.name.trim(),
    pricePerPlate: Number(draft.pricePerPlate),
    description: draft.description.trim() || null,
    menus,
    groups,
  };
}

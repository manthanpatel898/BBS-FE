'use client';

import { useState } from 'react';
import { FlexibleChoiceGroup } from '@/lib/auth/types';
import {
  addFlexibleAddonItem,
  countFlexibleGroupSelection,
  FlexibleAddonDestination,
  FlexibleSelectedMenu,
  removeFlexibleAddonItem,
  toggleFlexibleDirectItem,
  toggleFlexibleSubmenuItem,
} from '@/lib/bookings/flexible-menu-selection';

type Props = {
  groups: FlexibleChoiceGroup[];
  selectedMenus: FlexibleSelectedMenu[];
  onChange: (selectedMenus: FlexibleSelectedMenu[]) => void;
};

function ChoiceButton({
  checked,
  label,
  onClick,
}: {
  checked: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={checked}
      onClick={onClick}
      className={`flex min-h-11 w-full items-center gap-2 rounded-xl border px-3 py-2.5 text-left text-sm transition sm:rounded-2xl sm:px-4 sm:py-3 ${
        checked
          ? 'border-amber-300 bg-amber-50 text-slate-950 shadow-sm'
          : 'border-slate-200 bg-slate-50 text-slate-700 hover:border-slate-300'
      }`}
    >
      <span
        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border ${
          checked
            ? 'border-amber-500 bg-amber-500 text-white'
            : 'border-slate-300 bg-white text-transparent'
        }`}
      >
        <svg viewBox="0 0 20 20" fill="currentColor" className="h-3.5 w-3.5">
          <path
            fillRule="evenodd"
            d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.6-3.6a1 1 0 111.415-1.42l2.893 2.894 6.493-6.494a1 1 0 011.414 0z"
            clipRule="evenodd"
          />
        </svg>
      </span>
      <span className="min-w-0 flex-1 break-words font-medium leading-snug">
        {label}
      </span>
    </button>
  );
}

export function FlexibleMenuSelector({ groups, selectedMenus, onChange }: Props) {
  const [searches, setSearches] = useState<Record<string, string>>({});
  const [addonEditor, setAddonEditor] = useState<{
    groupId: string;
    destination: string;
    item: string;
  } | null>(null);

  const addonGroup = addonEditor
    ? groups.find((group) => group.groupId === addonEditor.groupId) ?? null
    : null;

  function destinationOptions(group: FlexibleChoiceGroup) {
    return [
      ...(group.allowedDirectItems.length > 0
        ? [{ value: 'DIRECT', label: 'Menu Items' }]
        : []),
      ...group.submenuRules.map((rule) => ({
        value: `SUBMENU:${rule.sectionTitle}`,
        label: rule.sectionTitle,
      })),
    ];
  }

  function parseDestination(value: string): FlexibleAddonDestination | null {
    if (value === 'DIRECT') return { type: 'DIRECT' };
    if (value.startsWith('SUBMENU:')) {
      return { type: 'SUBMENU', sectionTitle: value.slice('SUBMENU:'.length) };
    }
    return null;
  }

  function openAddonEditor(group: FlexibleChoiceGroup) {
    const firstDestination = destinationOptions(group)[0]?.value ?? '';
    setAddonEditor({ groupId: group.groupId, destination: firstDestination, item: '' });
  }

  const isConfiguredItem = (item: string, configuredItems: string[]) => {
    const normalizedItem = item.normalize('NFKC').trim().toLocaleLowerCase('en-US');
    return configuredItems.some(
      (configuredItem) =>
        configuredItem.normalize('NFKC').trim().toLocaleLowerCase('en-US') ===
        normalizedItem,
    );
  };

  return (
    <div className="space-y-3 sm:space-y-4">
      {groups.map((group) => {
        const summary = countFlexibleGroupSelection(group, selectedMenus);
        const selectedMenu = selectedMenus.find(
          (menu) => menu.menuId === group.menuId,
        );
        const search = searches[group.groupId] ?? '';
        const normalizedSearch = search.trim().toLocaleLowerCase();
        const matches = (item: string) =>
          !normalizedSearch || item.toLocaleLowerCase().includes(normalizedSearch);

        return (
          <section
            key={group.groupId}
            className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm"
          >
            <div className="border-b border-slate-100 bg-gradient-to-r from-amber-50 to-white p-3 sm:p-5">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
                <div className="min-w-0">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-amber-600 sm:text-xs">
                    Flexible menu
                  </p>
                  <h3 className="mt-1 break-words text-lg font-semibold text-slate-950 sm:text-xl">
                    {group.menuTitle}
                  </h3>
                  <p className="mt-1 text-xs text-slate-600 sm:text-sm">
                    Choose any {group.includedChoices}. More selections are allowed.
                  </p>
                </div>
                <div className="flex shrink-0 flex-wrap gap-2">
                  <span className="rounded-full bg-slate-900 px-3 py-1.5 text-xs font-semibold text-white">
                    {summary.selected} selected · {summary.included} included
                  </span>
                  {summary.additional > 0 ? (
                    <span className="rounded-full bg-amber-100 px-3 py-1.5 text-xs font-semibold text-amber-800">
                      +{summary.additional} additional
                    </span>
                  ) : null}
                  <button
                    type="button"
                    onClick={() => openAddonEditor(group)}
                    className="rounded-full border border-slate-300 bg-white px-3 py-1.5 text-xs font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50"
                  >
                    + Add-on
                  </button>
                </div>
              </div>
              <input
                type="search"
                value={search}
                onChange={(event) =>
                  setSearches((current) => ({
                    ...current,
                    [group.groupId]: event.target.value,
                  }))
                }
                placeholder={`Search ${group.menuTitle}`}
                className="mt-3 w-full rounded-xl border border-slate-200 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100 sm:max-w-sm"
              />
            </div>

            <div className="space-y-5 p-3 sm:p-5">
              {(() => {
                const directAddons = (selectedMenu?.directItems ?? []).filter(
                  (item) => !isConfiguredItem(item, group.allowedDirectItems),
                );
                const submenuAddons = group.submenuRules.flatMap((rule) => {
                  const selectedItems =
                    selectedMenu?.sections.find(
                      (section) => section.sectionTitle === rule.sectionTitle,
                    )?.items ?? [];
                  return selectedItems
                    .filter((item) => !isConfiguredItem(item, rule.allowedItems))
                    .map((item) => ({ item, sectionTitle: rule.sectionTitle }));
                });

                return directAddons.length > 0 || submenuAddons.length > 0 ? (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/60 p-3 sm:rounded-2xl sm:p-4">
                    <h4 className="text-xs font-semibold uppercase tracking-[0.14em] text-amber-800">
                      Added items
                    </h4>
                    <div className="mt-2 flex flex-wrap gap-2">
                      {directAddons.map((item) => (
                        <AddonChip
                          key={`${group.groupId}-direct-addon-${item}`}
                          item={item}
                          destinationLabel="Menu Items"
                          onRemove={() =>
                            onChange(
                              removeFlexibleAddonItem(
                                selectedMenus,
                                group,
                                { type: 'DIRECT' },
                                item,
                              ),
                            )
                          }
                        />
                      ))}
                      {submenuAddons.map(({ item, sectionTitle }) => (
                        <AddonChip
                          key={`${group.groupId}-${sectionTitle}-addon-${item}`}
                          item={item}
                          destinationLabel={sectionTitle}
                          onRemove={() =>
                            onChange(
                              removeFlexibleAddonItem(
                                selectedMenus,
                                group,
                                { type: 'SUBMENU', sectionTitle },
                                item,
                              ),
                            )
                          }
                        />
                      ))}
                    </div>
                  </div>
                ) : null;
              })()}
              {group.allowedDirectItems.some(matches) ? (
                <div>
                  <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                    Menu items
                  </h4>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                    {group.allowedDirectItems.filter(matches).map((item) => {
                      const checked = selectedMenu?.directItems?.includes(item) ?? false;
                      return (
                        <ChoiceButton
                          key={`${group.groupId}-direct-${item}`}
                          checked={checked}
                          label={item}
                          onClick={() =>
                            onChange(
                              toggleFlexibleDirectItem(
                                selectedMenus,
                                group,
                                item,
                                !checked,
                              ),
                            )
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              ) : null}

              {group.submenuRules.map((rule) => {
                const items = rule.allowedItems.filter(matches);
                if (!items.length) return null;
                const selectedSection = selectedMenu?.sections.find(
                  (section) => section.sectionTitle === rule.sectionTitle,
                );
                return (
                  <div key={`${group.groupId}-${rule.sectionTitle}`}>
                    <h4 className="mb-2 text-xs font-semibold uppercase tracking-[0.14em] text-slate-600">
                      {rule.sectionTitle}
                    </h4>
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 xl:grid-cols-3">
                      {items.map((item) => {
                        const checked = selectedSection?.items.includes(item) ?? false;
                        return (
                          <ChoiceButton
                            key={`${group.groupId}-${rule.sectionTitle}-${item}`}
                            checked={checked}
                            label={item}
                            onClick={() =>
                              onChange(
                                toggleFlexibleSubmenuItem(
                                  selectedMenus,
                                  group,
                                  rule.sectionTitle,
                                  item,
                                  !checked,
                                ),
                              )
                            }
                          />
                        );
                      })}
                    </div>
                  </div>
                );
              })}

              {normalizedSearch &&
              !group.allowedDirectItems.some(matches) &&
              !group.submenuRules.some((rule) => rule.allowedItems.some(matches)) ? (
                <div className="rounded-xl border border-dashed border-slate-200 bg-slate-50 p-4 text-sm text-slate-500">
                  No menu items match this search.
                </div>
              ) : null}
            </div>
          </section>
        );
      })}

      {addonEditor && addonGroup ? (
        <div className="fixed inset-0 z-[80] flex items-end justify-center bg-slate-950/45 p-0 backdrop-blur-sm sm:items-center sm:p-4">
          <div
            role="dialog"
            aria-modal="true"
            aria-labelledby="flexible-addon-title"
            className="w-full rounded-t-3xl bg-white p-5 shadow-2xl sm:max-w-md sm:rounded-3xl sm:p-6"
          >
            <div className="flex items-start justify-between gap-4">
              <div>
                <p className="text-xs font-semibold uppercase tracking-[0.18em] text-amber-600">
                  Flexible menu add-on
                </p>
                <h3 id="flexible-addon-title" className="mt-1 text-xl font-bold text-slate-950">
                  Add item to {addonGroup.menuTitle}
                </h3>
              </div>
              <button
                type="button"
                aria-label="Close add-on popup"
                onClick={() => setAddonEditor(null)}
                className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full border border-slate-200 text-xl text-slate-500 hover:bg-slate-50"
              >
                ×
              </button>
            </div>

            <div className="mt-5 space-y-4">
              {destinationOptions(addonGroup).length > 1 ? (
                <label className="block">
                  <span className="text-sm font-semibold text-slate-700">Add under</span>
                  <select
                    value={addonEditor.destination}
                    onChange={(event) =>
                      setAddonEditor((current) =>
                        current ? { ...current, destination: event.target.value } : current,
                      )
                    }
                    className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-900 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                  >
                    {destinationOptions(addonGroup).map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              <label className="block">
                <span className="text-sm font-semibold text-slate-700">Item name</span>
                <input
                  type="text"
                  autoFocus
                  value={addonEditor.item}
                  onChange={(event) =>
                    setAddonEditor((current) =>
                      current ? { ...current, item: event.target.value } : current,
                    )
                  }
                  onKeyDown={(event) => {
                    if (event.key !== 'Enter') return;
                    const destination = parseDestination(addonEditor.destination);
                    if (!destination || !addonEditor.item.trim()) return;
                    onChange(
                      addFlexibleAddonItem(
                        selectedMenus,
                        addonGroup,
                        destination,
                        addonEditor.item,
                      ),
                    );
                    setAddonEditor(null);
                  }}
                  placeholder="Enter an item not available in the list"
                  className="mt-2 min-h-11 w-full rounded-xl border border-slate-200 bg-white px-3 text-sm text-slate-950 placeholder:text-slate-400 outline-none focus:border-amber-300 focus:ring-2 focus:ring-amber-100"
                />
              </label>
            </div>

            <div className="mt-6 grid grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => setAddonEditor(null)}
                className="min-h-11 rounded-xl border border-slate-200 bg-white px-4 text-sm font-semibold text-slate-700"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={!addonEditor.item.trim() || !addonEditor.destination}
                onClick={() => {
                  const destination = parseDestination(addonEditor.destination);
                  if (!destination || !addonEditor.item.trim()) return;
                  onChange(
                    addFlexibleAddonItem(
                      selectedMenus,
                      addonGroup,
                      destination,
                      addonEditor.item,
                    ),
                  );
                  setAddonEditor(null);
                }}
                className="min-h-11 rounded-xl bg-amber-500 px-4 text-sm font-bold text-slate-950 shadow-sm disabled:cursor-not-allowed disabled:opacity-50"
              >
                Add item
              </button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function AddonChip({
  item,
  destinationLabel,
  onRemove,
}: {
  item: string;
  destinationLabel: string;
  onRemove: () => void;
}) {
  return (
    <span className="inline-flex max-w-full items-center gap-2 rounded-full border border-amber-200 bg-white px-3 py-1.5 text-xs text-slate-800 shadow-sm">
      <span className="min-w-0 truncate font-semibold">{item}</span>
      <span className="shrink-0 text-amber-700">{destinationLabel} · Add-on</span>
      <button
        type="button"
        aria-label={`Remove add-on ${item}`}
        onClick={onRemove}
        className="shrink-0 text-base leading-none text-slate-400 hover:text-red-600"
      >
        ×
      </button>
    </span>
  );
}

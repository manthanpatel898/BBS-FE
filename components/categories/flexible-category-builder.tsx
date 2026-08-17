'use client';

import { useEffect, useState } from 'react';
import { Menu } from '@/lib/auth/types';
import { BulkMenuItemsModal } from './bulk-menu-items-modal';
import {
  createFlexibleChoiceGroup,
  FlexibleCategoryDraft,
  FlexibleChoiceGroupDraft,
} from '@/lib/categories/flexible-category-builder';

const fieldClass =
  'min-h-11 w-full rounded-xl border border-slate-300 bg-white px-3 py-2.5 text-sm text-slate-900 placeholder:text-slate-400 outline-none focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

type Props = {
  draft: FlexibleCategoryDraft;
  menus: Menu[];
  errors: Record<string, string>;
  onChange: (draft: FlexibleCategoryDraft) => void;
};

export function FlexibleCategoryBuilder({ draft, menus, errors, onChange }: Props) {
  const [openGroupId, setOpenGroupId] = useState<string | null>(draft.groups[0]?.id ?? null);
  const [bulkTarget, setBulkTarget] = useState<{
    groupId: string;
    submenuId?: string;
    title: string;
    existingItems: string[];
  } | null>(null);

  useEffect(() => {
    const groupWithError = draft.groups.find((group) => errors[group.id]);
    if (groupWithError) setOpenGroupId(groupWithError.id);
  }, [draft.groups, errors]);

  function updateGroup(groupId: string, updater: (group: FlexibleChoiceGroupDraft) => FlexibleChoiceGroupDraft) {
    onChange({ ...draft, groups: draft.groups.map((group) => group.id === groupId ? updater(group) : group) });
  }

  return (
    <div data-mobile-layout="flexible-category-builder" className="space-y-4 sm:space-y-5">
      <div className="grid gap-4 md:grid-cols-2">
        <label className="space-y-1.5 text-sm font-semibold text-slate-700">
          Category name
          <input className={fieldClass} value={draft.name} onChange={(event) => onChange({ ...draft, name: event.target.value })} />
          {errors.name ? <span className="block text-xs text-red-600">{errors.name}</span> : null}
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700">
          Price per plate
          <input className={fieldClass} inputMode="decimal" value={draft.pricePerPlate} onChange={(event) => onChange({ ...draft, pricePerPlate: event.target.value })} />
          {errors.pricePerPlate ? <span className="block text-xs text-red-600">{errors.pricePerPlate}</span> : null}
        </label>
        <label className="space-y-1.5 text-sm font-semibold text-slate-700 md:col-span-2">
          Description (optional)
          <textarea className={`${fieldClass} min-h-24 resize-y`} value={draft.description} onChange={(event) => onChange({ ...draft, description: event.target.value })} />
        </label>
      </div>

      {draft.groups.map((group, groupIndex) => (
        <section key={group.id} className={`overflow-hidden rounded-2xl border bg-slate-50 ${errors[group.id] ? 'border-red-300' : 'border-slate-200'}`}>
          <div className="flex items-start justify-between gap-2 p-4 sm:p-5">
            <button
              type="button"
              aria-expanded={openGroupId === group.id}
              aria-controls={`choice-group-${group.id}`}
              aria-label={`${openGroupId === group.id ? 'Collapse' : 'Expand'} choice group ${groupIndex + 1}`}
              onClick={() => setOpenGroupId((current) => current === group.id ? null : group.id)}
              className="min-w-0 flex-1 text-left md:pointer-events-none"
            >
              <p className="text-xs font-semibold uppercase tracking-wider text-amber-700">Choice group {groupIndex + 1}</p>
              <h3 className="mt-1 truncate text-base font-bold text-slate-900 sm:text-lg">{group.menuTitle.trim() || 'Menu and included choices'}</h3>
              <div className="mt-3 grid grid-cols-3 gap-2 sm:hidden">
                <span className="rounded-lg bg-white px-2 py-1.5 text-center text-[11px] text-slate-600"><b className="block text-sm text-slate-900">{group.includedChoices || '—'}</b>Choice limit</span>
                <span className="rounded-lg bg-white px-2 py-1.5 text-center text-[11px] text-slate-600"><b className="block text-sm text-slate-900">{group.directItems.length}</b>Direct items</span>
                <span className="rounded-lg bg-white px-2 py-1.5 text-center text-[11px] text-slate-600"><b className="block text-sm text-slate-900">{group.submenus.length}</b>Submenus</span>
              </div>
            </button>
            <div className="flex shrink-0 items-center gap-1">
              {draft.groups.length > 1 ? (
                <button type="button" aria-label={`Remove choice group ${groupIndex + 1}`} className="flex h-11 w-11 items-center justify-center rounded-xl border border-red-200 text-xl text-red-600" onClick={() => onChange({ ...draft, groups: draft.groups.filter((item) => item.id !== group.id) })}>×</button>
              ) : null}
              <button
                type="button"
                aria-hidden="true"
                tabIndex={-1}
                className="flex h-11 w-11 items-center justify-center rounded-xl border border-slate-200 bg-white text-slate-600 md:hidden"
                onClick={() => setOpenGroupId((current) => current === group.id ? null : group.id)}
              >
                <svg className={`h-4 w-4 transition ${openGroupId === group.id ? 'rotate-180' : ''}`} viewBox="0 0 20 20" fill="none" stroke="currentColor" strokeWidth="2"><path d="m5 7.5 5 5 5-5" /></svg>
              </button>
            </div>
          </div>

          <div id={`choice-group-${group.id}`} className={`${openGroupId === group.id ? 'block' : 'hidden'} border-t border-slate-200 p-4 md:block sm:p-5`}>

          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Menu source
              <select className={fieldClass} value={group.menuMode} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, menuMode: event.target.value as 'EXISTING' | 'CREATE', menuId: '', menuTitle: '', directItems: [], submenus: [] }))}>
                <option value="CREATE">Create new reusable menu</option>
                <option value="EXISTING">Use existing menu</option>
              </select>
            </label>
            <label className="space-y-1.5 text-sm font-semibold text-slate-700">
              Included choices across this menu
              <input className={fieldClass} inputMode="numeric" value={group.includedChoices} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, includedChoices: event.target.value.replace(/\D/g, '') }))} />
            </label>
          </div>

          {group.menuMode === 'EXISTING' ? (
            <div className="mt-4 space-y-4">
            <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
              Existing menu
              <select className={fieldClass} value={group.menuId} onChange={(event) => {
                const menu = menus.find((item) => item.id === event.target.value);
                updateGroup(group.id, (current) => ({ ...current, menuId: event.target.value, menuTitle: menu?.title ?? '', directItems: [...(menu?.directItems?.items ?? [])], submenus: (menu?.sections ?? []).map((section) => ({ id: crypto.randomUUID(), title: section.sectionTitle, items: [...section.items] })) }));
              }}>
                <option value="">Select menu</option>
                {menus.filter((menu) => menu.isActive !== false).map((menu) => <option key={menu.id} value={menu.id}>{menu.title}</option>)}
              </select>
            </label>
            {(() => {
              const selectedMenu = menus.find((menu) => menu.id === group.menuId);
              if (!selectedMenu) return null;
              return (
                <div className="space-y-4 rounded-xl border border-slate-200 bg-white p-3">
                  {(selectedMenu.directItems?.items.length ?? 0) > 0 ? (
                    <div>
                      <p className="text-sm font-bold text-slate-900">Direct menu items</p>
                      <div className="mt-2 grid gap-2 sm:grid-cols-2">
                        {selectedMenu.directItems!.items.map((item) => {
                          const checked = group.directItems.includes(item);
                          return <button key={item} type="button" aria-pressed={checked} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold ${checked ? 'border-amber-400 bg-amber-50 text-slate-950' : 'border-slate-200 text-slate-600'}`} onClick={() => updateGroup(group.id, (current) => ({ ...current, directItems: checked ? current.directItems.filter((value) => value !== item) : [...current.directItems, item] }))}>{checked ? '✓ ' : ''}{item}</button>;
                        })}
                      </div>
                    </div>
                  ) : null}
                  {selectedMenu.sections.map((section) => {
                    const selected = group.submenus.find((submenu) => submenu.title === section.sectionTitle);
                    return (
                      <div key={section.sectionTitle}>
                        <p className="text-sm font-bold text-slate-900">{section.sectionTitle}</p>
                        <div className="mt-2 grid gap-2 sm:grid-cols-2">
                          {section.items.map((item) => {
                            const checked = selected?.items.includes(item) ?? false;
                            return <button key={item} type="button" aria-pressed={checked} className={`min-h-11 rounded-xl border px-3 text-left text-sm font-semibold ${checked ? 'border-amber-400 bg-amber-50 text-slate-950' : 'border-slate-200 text-slate-600'}`} onClick={() => updateGroup(group.id, (current) => {
                              const existing = current.submenus.find((submenu) => submenu.title === section.sectionTitle) ?? { id: crypto.randomUUID(), title: section.sectionTitle, items: [] };
                              const items = checked ? existing.items.filter((value) => value !== item) : [...existing.items, item];
                              const others = current.submenus.filter((submenu) => submenu.title !== section.sectionTitle);
                              return { ...current, submenus: items.length ? [...others, { ...existing, items }] : others };
                            })}>{checked ? '✓ ' : ''}{item}</button>;
                          })}
                        </div>
                      </div>
                    );
                  })}
                </div>
              );
            })()}
            </div>
          ) : (
            <div className="mt-4 space-y-4">
              <label className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span className="block">New menu name</span>
                <input className={fieldClass} value={group.menuTitle} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, menuTitle: event.target.value }))} placeholder="e.g. Starter / Farsan" />
              </label>
              <div className="block space-y-1.5 text-sm font-semibold text-slate-700">
                <span className="flex flex-wrap items-center justify-between gap-2">
                  <span>Direct menu items (optional)</span>
                  <button type="button" className="min-h-10 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-900" onClick={() => setBulkTarget({ groupId: group.id, title: 'Direct menu items', existingItems: group.directItems })}>Bulk Add Items</button>
                </span>
                <span className="block space-y-2">
                  {group.directItems.map((item, itemIndex) => (
                    <span key={`${group.id}-direct-${itemIndex}`} className="flex gap-2">
                      <input aria-label={`Direct item ${itemIndex + 1}`} className={fieldClass} value={item} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, directItems: current.directItems.map((value, index) => index === itemIndex ? event.target.value : value) }))} />
                      <button type="button" aria-label={`Remove direct item ${itemIndex + 1}`} className="min-h-11 rounded-xl border border-red-200 px-3 text-red-600" onClick={() => updateGroup(group.id, (current) => ({ ...current, directItems: current.directItems.filter((_, index) => index !== itemIndex) }))}>×</button>
                    </span>
                  ))}
                  <button type="button" className="min-h-11 w-full rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-700" onClick={() => updateGroup(group.id, (current) => ({ ...current, directItems: [...current.directItems, ''] }))}>+ Add direct item</button>
                </span>
              </div>
              <div className="space-y-3">
                {group.submenus.map((submenu, submenuIndex) => (
                  <div key={submenu.id} className="rounded-xl border border-slate-200 bg-white p-3">
                    <div className="flex items-center justify-between gap-2">
                      <p className="text-sm font-bold text-slate-900">Submenu {submenuIndex + 1}</p>
                      <div className="flex flex-wrap items-center justify-end gap-1">
                        <button type="button" className="min-h-10 rounded-xl border border-amber-300 bg-amber-50 px-3 text-xs font-bold text-amber-900" onClick={() => setBulkTarget({ groupId: group.id, submenuId: submenu.id, title: submenu.title || `Submenu ${submenuIndex + 1}`, existingItems: submenu.items })}>Bulk Add Items</button>
                        <button type="button" className="min-h-10 px-2 text-sm font-semibold text-red-600" onClick={() => updateGroup(group.id, (current) => ({ ...current, submenus: current.submenus.filter((item) => item.id !== submenu.id) }))}>Remove</button>
                      </div>
                    </div>
                    <input className={`${fieldClass} mt-2`} value={submenu.title} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, submenus: current.submenus.map((item) => item.id === submenu.id ? { ...item, title: event.target.value } : item) }))} placeholder="Submenu name, e.g. Starter" />
                    <div className="mt-2 space-y-2">
                      {submenu.items.map((item, itemIndex) => (
                        <div key={`${submenu.id}-item-${itemIndex}`} className="flex gap-2">
                          <input aria-label={`${submenu.title || 'Submenu'} item ${itemIndex + 1}`} className={fieldClass} value={item} onChange={(event) => updateGroup(group.id, (current) => ({ ...current, submenus: current.submenus.map((entry) => entry.id === submenu.id ? { ...entry, items: entry.items.map((value, index) => index === itemIndex ? event.target.value : value) } : entry) }))} />
                          <button type="button" className="min-h-11 rounded-xl border border-red-200 px-3 text-red-600" onClick={() => updateGroup(group.id, (current) => ({ ...current, submenus: current.submenus.map((entry) => entry.id === submenu.id ? { ...entry, items: entry.items.filter((_, index) => index !== itemIndex) } : entry) }))}>×</button>
                        </div>
                      ))}
                      <button type="button" className="min-h-11 w-full rounded-xl border border-dashed border-slate-300 text-sm font-semibold text-slate-700" onClick={() => updateGroup(group.id, (current) => ({ ...current, submenus: current.submenus.map((entry) => entry.id === submenu.id ? { ...entry, items: [...entry.items, ''] } : entry) }))}>+ Add submenu item</button>
                    </div>
                  </div>
                ))}
                <button type="button" className="min-h-11 w-full rounded-xl border border-dashed border-amber-400 bg-amber-50 px-4 text-sm font-semibold text-amber-800" onClick={() => updateGroup(group.id, (current) => ({ ...current, submenus: [...current.submenus, { id: crypto.randomUUID(), title: '', items: [] }] }))}>+ Add optional submenu</button>
              </div>
            </div>
          )}

          {group.menuMode === 'EXISTING' && group.menuId ? (
            <div className="mt-4 rounded-xl bg-white p-3 text-sm text-slate-600">
              <b className="text-slate-900">{group.directItems.length + group.submenus.reduce((sum, submenu) => sum + submenu.items.length, 0)} items available.</b> All existing items are included in this category.
            </div>
          ) : null}
          {errors[group.id] ? <p className="mt-3 text-sm font-semibold text-red-600">{errors[group.id]}</p> : null}
          </div>
        </section>
      ))}

      <button type="button" className="min-h-12 w-full rounded-xl border border-slate-300 bg-white px-4 text-sm font-bold text-slate-800" onClick={() => {
        const group = createFlexibleChoiceGroup();
        onChange({ ...draft, groups: [...draft.groups, group] });
        setOpenGroupId(group.id);
      }}>+ Add another menu choice group</button>

      {bulkTarget ? (
        <BulkMenuItemsModal
          title={bulkTarget.title}
          existingItems={bulkTarget.existingItems}
          onClose={() => setBulkTarget(null)}
          onApply={(items) => updateGroup(bulkTarget.groupId, (group) => bulkTarget.submenuId
            ? { ...group, submenus: group.submenus.map((submenu) => submenu.id === bulkTarget.submenuId ? { ...submenu, items: [...submenu.items, ...items] } : submenu) }
            : { ...group, directItems: [...group.directItems, ...items] })}
        />
      ) : null}
    </div>
  );
}

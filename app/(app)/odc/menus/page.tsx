'use client';

import { useEffect, useMemo, useState } from 'react';
import { ConfigRoute } from '@/components/auth/config-route';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import { PageLoader } from '@/components/ui/page-loader';
import { RoleBasedRestaurantSelector } from '@/components/ui/role-based-restaurant-selector';
import {
  createOdcMenu,
  deleteOdcMenu,
  fetchOdcMenus,
  fetchRestaurants,
  updateOdcMenu,
} from '@/lib/auth/api';
import { MenuSection, OdcMenu, Restaurant } from '@/lib/auth/types';

type MenuFormState = {
  displayOrder: string;
  sectionTitle: string;
  items: Array<{ name: string; description: string }>;
  hotSellingItems: string[];
};

const initialFormState: MenuFormState = {
  displayOrder: '',
  sectionTitle: '',
  items: [],
  hotSellingItems: [],
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

function parseSubitems(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(/[\n,]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  );
}

function countSubitems(sections: MenuSection[]) {
  return sections.reduce((count, section) => count + section.items.length, 0);
}

function getSubitemDescription(section: MenuSection | undefined, item: string) {
  return section?.subitemDescriptions?.find((entry) => entry.name === item)?.description ?? '';
}

export default function OdcMenusPage() {
  useAppPageHeader({
    eyebrow: 'Outdoor Catering',
    title: 'ODC Menus',
  });

  const { accessToken, user } = useAuth();
  const [menus, setMenus] = useState<OdcMenu[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<OdcMenu | null>(null);
  const [formState, setFormState] = useState<MenuFormState>(initialFormState);
  const [itemDraft, setItemDraft] = useState('');
  const [itemDescriptionDraft, setItemDescriptionDraft] = useState('');
  const [subitemSearch, setSubitemSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<OdcMenu | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const effectiveRestaurantId = isSuperAdmin ? selectedRestaurantId : user?.restaurantId ?? '';
  const hasOdcAccess = Boolean(user?.canAccessOdc);

  useEffect(() => {
    if (!accessToken || !isSuperAdmin) return;

    const token = accessToken;

    async function loadRestaurants() {
      try {
        const response = await fetchRestaurants(token, { page: 1, limit: 100, search: '' });
        const odcRestaurants = response.items.filter((restaurant) => restaurant.enableOdc);
        setRestaurants(odcRestaurants);
        setSelectedRestaurantId((current) => current || odcRestaurants[0]?.id || '');
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch restaurants.',
        );
      }
    }

    void loadRestaurants();
  }, [accessToken, isSuperAdmin]);

  useEffect(() => {
    if (!accessToken || !hasOdcAccess || !effectiveRestaurantId) {
      return;
    }

    const token = accessToken;

    async function loadData() {
      try {
        setIsLoading(true);
        setError('');

        const menusResponse = await fetchOdcMenus(token, {
          page,
          limit,
          search,
          ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
        });

        setMenus(menusResponse.items);
        setTotalPages(menusResponse.pagination.totalPages);
        setTotalItems(menusResponse.pagination.total);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to fetch ODC menus.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [accessToken, effectiveRestaurantId, hasOdcAccess, isSuperAdmin, limit, page, search]);

  async function reloadMenus(token: string, nextPage: number) {
    const response = await fetchOdcMenus(token, {
      page: nextPage,
      limit,
      search,
      ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
    });
    setMenus(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

  function openCreateModal() {
    setEditingMenu(null);
    setFormState(initialFormState);
    setItemDraft('');
    setItemDescriptionDraft('');
    setSubitemSearch('');
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(menu: OdcMenu) {
    const firstSection = menu.sections[0];
    setEditingMenu(menu);
    setFormState({
      sectionTitle: firstSection?.sectionTitle ?? menu.title,
      displayOrder:
        typeof menu.displayOrder === 'number' && menu.displayOrder > 0
          ? String(menu.displayOrder)
          : '',
      items: (firstSection?.items ?? []).map((item) => ({
        name: item,
        description: getSubitemDescription(firstSection, item),
      })),
      hotSellingItems: [...(firstSection?.hotSellingItems ?? [])],
    });
    setItemDraft('');
    setItemDescriptionDraft('');
    setSubitemSearch('');
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function addItems(rawValue?: string) {
    const values = parseSubitems(rawValue ?? itemDraft);
    if (!values.length) return;

    setFormState((current) => ({
      ...current,
      items: [
        ...current.items,
        ...values
          .filter((value) => !current.items.some((item) => item.name === value))
          .map((value) => ({
            name: value,
            description: values.length === 1 ? itemDescriptionDraft.trim() : '',
          })),
      ],
    }));
    setItemDraft('');
    setItemDescriptionDraft('');
  }

  function removeItem(item: string) {
    setFormState((current) => ({
      ...current,
      items: current.items.filter((currentItem) => currentItem.name !== item),
      hotSellingItems: current.hotSellingItems.filter((currentItem) => currentItem !== item),
    }));
  }

  function updateItemDescription(item: string, description: string) {
    setFormState((current) => ({
      ...current,
      items: current.items.map((currentItem) =>
        currentItem.name === item ? { ...currentItem, description } : currentItem,
      ),
    }));
  }

  function toggleHotSellingItem(item: string) {
    setFormState((current) => {
      const exists = current.hotSellingItems.includes(item);
      return {
        ...current,
        hotSellingItems: exists
          ? current.hotSellingItems.filter((currentItem) => currentItem !== item)
          : [...current.hotSellingItems, item],
      };
    });
  }

  async function handleSubmit(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!accessToken) {
      setError('Missing session token.');
      return;
    }

    if (!effectiveRestaurantId) {
      setError('Select an ODC-enabled restaurant first.');
      return;
    }

    const itemNames = formState.items.map((item) => item.name);
    if (!itemNames.length) {
      setError('Add at least one menu item.');
      return;
    }

    const displayOrder = formState.displayOrder.trim()
      ? Number(formState.displayOrder)
      : undefined;

    if (displayOrder !== undefined && (!Number.isInteger(displayOrder) || displayOrder < 0)) {
      setError('Display order must be a whole number.');
      return;
    }

    const payload = {
      title: formState.sectionTitle.trim(),
      displayOrder,
      sections: [
        {
          sectionTitle: formState.sectionTitle.trim(),
          items: itemNames,
          hotSellingItems: formState.hotSellingItems.filter((item) => itemNames.includes(item)),
          subitemDescriptions: formState.items
            .filter((item) => item.description.trim())
            .map((item) => ({
              name: item.name,
              description: item.description.trim(),
            })),
        },
      ],
      ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
    };

    try {
      setIsSubmitting(true);
      setError('');

      if (editingMenu) {
        await updateOdcMenu(accessToken, editingMenu.id, payload);
        setSuccessMessage('ODC menu updated successfully.');
      } else {
        await createOdcMenu(accessToken, payload);
        setSuccessMessage('ODC menu created successfully.');
      }

      setIsModalOpen(false);
      const nextPage = editingMenu ? page : 1;
      setPage(nextPage);
      await reloadMenus(accessToken, nextPage);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to save ODC menu.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  const filteredSubitems = useMemo(() => {
    const term = subitemSearch.trim().toLowerCase();
    if (!term) return formState.items;
    return formState.items.filter(
      (item) =>
        item.name.toLowerCase().includes(term) ||
        item.description.toLowerCase().includes(term),
    );
  }, [formState.items, subitemSearch]);

  const totalConfiguredSubitems = formState.items.length;

  async function handleDelete() {
    if (!accessToken || !menuToDelete) return;

    try {
      setIsDeleting(true);
      setError('');
      await deleteOdcMenu(accessToken, menuToDelete.id);
      setSuccessMessage('ODC menu deleted successfully.');
      setMenuToDelete(null);
      await reloadMenus(accessToken, page);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to delete ODC menu.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  if (!hasOdcAccess) {
    return (
      <ConfigRoute>
        <section className="rounded-2xl border border-amber-100 bg-amber-50 p-5 text-sm text-amber-800">
          Outdoor Catering is not enabled for your account.
        </section>
      </ConfigRoute>
    );
  }

  return (
    <ConfigRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="mt-1 text-sm text-slate-500">
              Create item groups like Mocktail or Soups and manage multiple subitems under each one.
            </p>
          </div>
          <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
            <button
              type="button"
              onClick={openCreateModal}
              disabled={!effectiveRestaurantId}
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add menu
            </button>
          </div>
        </div>

        {isSuperAdmin ? (
          <RoleBasedRestaurantSelector
            isVisible={isSuperAdmin}
            restaurants={restaurants}
            value={selectedRestaurantId}
            onChange={(value) => {
              setSelectedRestaurantId(value);
              setPage(1);
              setSearchInput('');
            }}
          />
        ) : null}

        <div className="relative">
          <svg
            className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400"
            viewBox="0 0 24 24"
            fill="none"
            stroke="currentColor"
            strokeWidth={2}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <circle cx="11" cy="11" r="8" />
            <path d="m21 21-4.35-4.35" />
          </svg>
          <input
            value={searchInput}
            onChange={(event) => {
              const value = event.target.value;
              setSearchInput(value);
              setPage(1);
              setSearch(value.trim());
            }}
            placeholder="Search by menu name or subitem..."
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
          {searchInput ? (
            <button
              type="button"
              onClick={() => {
                setSearchInput('');
                setSearch('');
                setPage(1);
              }}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
        </div>

        <div className="space-y-4">
          {!effectiveRestaurantId ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-400 shadow-sm">
              Select a restaurant to view menus.
            </div>
          ) : isLoading ? (
            <PageLoader message="Loading menus..." />
          ) : menus.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-400 shadow-sm">
              No menus found.
            </div>
          ) : (
            menus.map((menu) => {
              const isOpen = openAccordionId === menu.id;
              const subitemCount = countSubitems(menu.sections);

              return (
                <div
                  key={menu.id}
                  className="overflow-hidden rounded-[28px] border border-slate-200 bg-white shadow-sm"
                >
                  <button
                    type="button"
                    onClick={() => setOpenAccordionId(isOpen ? null : menu.id)}
                    className="flex w-full items-center justify-between gap-4 px-5 py-5 text-left"
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                        Order #{menu.displayOrder ?? 0}
                      </p>
                      <h2 className="mt-2 text-xl font-bold text-slate-900">
                        {menu.sections[0]?.sectionTitle || menu.title || 'Untitled item'}
                      </h2>
                      <p className="mt-2 text-sm text-slate-500">
                        {subitemCount} subitem{subitemCount === 1 ? '' : 's'}
                      </p>
                    </div>
                    <span className="shrink-0 rounded-full bg-amber-50 px-3 py-1 text-sm font-medium text-amber-700">
                      {isOpen ? 'Collapse' : 'Expand'}
                    </span>
                  </button>
                  {isOpen ? (
                    <div className="border-t border-slate-100 px-5 py-5">
                      <div className="grid gap-4 md:grid-cols-2">
                        {menu.sections.map((section, index) => (
                          <div
                            key={`${menu.id}-${index}`}
                            className="rounded-2xl border border-slate-200 bg-slate-50 p-5"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                  Item
                                </p>
                                <h3 className="mt-1 text-lg font-semibold text-slate-900">
                                  {section.sectionTitle}
                                </h3>
                              </div>
                              <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                                {section.items.length} subitem{section.items.length === 1 ? '' : 's'}
                              </span>
                            </div>
                            <div className="mt-4 flex flex-wrap gap-2">
                              {section.items.map((item, itemIndex) => (
                                <span
                                  key={`${menu.id}-${index}-${itemIndex}`}
                                  className="rounded-full bg-amber-50 px-3 py-1 text-xs font-medium text-amber-700"
                                >
                                  {item}
                                </span>
                              ))}
                            </div>
                          </div>
                        ))}
                      </div>
                      <div className="mt-5 flex gap-2">
                        <button
                          type="button"
                          onClick={() => openEditModal(menu)}
                          className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                        >
                          Edit
                        </button>
                        <button
                          type="button"
                          onClick={() => setMenuToDelete(menu)}
                          className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                        >
                          Delete
                        </button>
                      </div>
                    </div>
                  ) : null}
                </div>
              );
            })
          )}
        </div>

        <div className="flex items-center justify-between text-sm">
          <p>
            <span className="text-slate-500">Page {page} of {totalPages} · {totalItems} total</span>
          </p>
          <div className="flex gap-2">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => setPage((currentPage) => currentPage - 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => setPage((currentPage) => currentPage + 1)}
              className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:opacity-40"
            >
              Next
            </button>
          </div>
        </div>

        {successMessage ? (
          <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-medium text-emerald-700">
            {successMessage}
          </div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
            {error}
          </div>
        ) : null}

        {isModalOpen ? (
          <CommonModal
            title={editingMenu ? 'Edit item' : 'Create item'}
            description="Manage item details and subitems."
            onClose={() => setIsModalOpen(false)}
            widthClassName="max-w-4xl"
            panelClassName="flex flex-col overflow-hidden"
            contentClassName="min-h-0 flex-1"
          >
            <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
              <div className="min-h-0 flex-1 space-y-4">
                <div className="grid gap-3 md:grid-cols-[minmax(0,1fr)_150px]">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Item name</span>
                    <input
                      value={formState.sectionTitle}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          sectionTitle: event.target.value,
                        }))
                      }
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') event.preventDefault();
                      }}
                      placeholder="Item name"
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Order number</span>
                    <input
                      type="number"
                      min="0"
                      step="1"
                      value={formState.displayOrder}
                      onChange={(event) =>
                        setFormState((current) => ({
                          ...current,
                          displayOrder: event.target.value,
                        }))
                      }
                      placeholder="Optional"
                      className={inputCls}
                    />
                  </label>
                </div>

                <div className="grid gap-3 md:grid-cols-[minmax(180px,0.8fr)_minmax(220px,1fr)_auto] md:items-end">
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Subitem name</span>
                    <input
                      type="text"
                      value={itemDraft}
                      onChange={(event) => setItemDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addItems();
                        }
                      }}
                      placeholder="Type one or more subitems"
                      className={inputCls}
                    />
                  </label>
                  <label className="space-y-1.5">
                    <span className="text-xs font-semibold uppercase tracking-wider text-slate-500">Description</span>
                    <input
                      type="text"
                      value={itemDescriptionDraft}
                      onChange={(event) => setItemDescriptionDraft(event.target.value)}
                      onKeyDown={(event) => {
                        if (event.key === 'Enter') {
                          event.preventDefault();
                          addItems();
                        }
                      }}
                      placeholder="Optional"
                      className={inputCls}
                    />
                  </label>
                  <button
                    type="button"
                    onClick={() => addItems()}
                    className="h-12 rounded-xl bg-amber-400 px-5 text-sm font-semibold text-white transition hover:bg-amber-500"
                  >
                    Add
                  </button>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <p className="text-sm font-semibold text-slate-900">Current subitems</p>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {totalConfiguredSubitems}
                    </span>
                  </div>
                  <div className="mt-3">
                    <input
                      value={subitemSearch}
                      onChange={(event) => setSubitemSearch(event.target.value)}
                      placeholder="Search subitems or descriptions"
                      className={`${inputCls} bg-white py-2.5`}
                    />
                  </div>
                  <div className="mt-3 max-h-[38vh] overflow-y-auto pr-1">
                    {formState.items.length === 0 ? (
                      <p className="text-sm text-slate-400">No subitems added yet.</p>
                    ) : filteredSubitems.length === 0 ? (
                      <p className="text-sm text-slate-400">No subitems match your search.</p>
                    ) : (
                      <div className="space-y-2">
                        {filteredSubitems.map((item) => (
                          <div
                            key={`${formState.sectionTitle}-${item.name}`}
                            className="grid gap-2 rounded-xl border border-slate-200 bg-white p-2.5 text-sm text-slate-700 md:grid-cols-[minmax(140px,0.6fr)_minmax(220px,1fr)] xl:grid-cols-[minmax(160px,0.7fr)_minmax(260px,1fr)_auto] xl:items-end"
                          >
                            <div className="min-w-0">
                              <p className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">Subitem</p>
                              <p className="mt-1 break-words font-semibold text-slate-900">{item.name}</p>
                            </div>
                            <label className="space-y-1">
                              <span className="text-[10px] font-semibold uppercase tracking-wider text-slate-500">
                                Description
                              </span>
                              <input
                                value={item.description}
                                onChange={(event) => updateItemDescription(item.name, event.target.value)}
                                placeholder="Optional"
                                className="w-full rounded-lg border border-slate-200 bg-slate-50 px-3 py-2 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                              />
                            </label>
                            <div className="flex shrink-0 flex-wrap items-center justify-end gap-3 md:col-span-2 xl:col-span-1">
                              <label className="flex items-center gap-2 text-xs font-semibold text-amber-700">
                                <input
                                  type="checkbox"
                                  checked={formState.hotSellingItems.includes(item.name)}
                                  onChange={() => toggleHotSellingItem(item.name)}
                                  className="h-4 w-4 rounded border-slate-300 text-amber-500 focus:ring-amber-400"
                                />
                                Hot selling
                              </label>
                              <button
                                type="button"
                                onClick={() => removeItem(item.name)}
                                aria-label={`Delete ${item.name}`}
                                title="Delete"
                                className="inline-flex h-9 w-9 items-center justify-center rounded-lg bg-red-50 text-red-600 transition hover:bg-red-100 focus:outline-none focus:ring-2 focus:ring-red-200"
                              >
                                <svg
                                  viewBox="0 0 20 20"
                                  fill="none"
                                  stroke="currentColor"
                                  strokeWidth="1.8"
                                  className="h-4 w-4"
                                  aria-hidden="true"
                                >
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M3 5h14" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M8 5V3.5h4V5" />
                                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 7.5 6.7 16h6.6L14 7.5" />
                                  <path strokeLinecap="round" d="M8.5 9.5v4M11.5 9.5v4" />
                                </svg>
                              </button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="sticky bottom-0 z-10 -mx-4 mt-4 grid grid-cols-2 gap-3 border-t border-slate-200 bg-white/95 px-4 pt-3 shadow-[0_-12px_24px_rgba(15,23,42,0.08)] backdrop-blur sm:-mx-6 sm:px-6">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {editingMenu ? 'Save changes' : 'Create menu'}
                </LoadingButton>
              </div>
            </form>
          </CommonModal>
        ) : null}

        {menuToDelete ? (
          <ConfirmModal
            title={`Delete ${menuToDelete.title}?`}
            message="This removes the ODC menu only. Banquet menus are not affected."
            confirmLabel="Delete"
            isLoading={isDeleting}
            onCancel={() => setMenuToDelete(null)}
            onConfirm={() => void handleDelete()}
          />
        ) : null}
      </section>
    </ConfigRoute>
  );
}

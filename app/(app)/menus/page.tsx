'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfigRoute } from '@/components/auth/config-route';
import { useAuth } from '@/components/auth/auth-provider';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { RoleBasedRestaurantSelector } from '@/components/ui/role-based-restaurant-selector';
import {
  createMenu,
  deleteMenu,
  fetchCategories,
  fetchMenus,
  fetchRestaurants,
  updateMenu,
} from '@/lib/auth/api';
import { Category, Menu, MenuSection, Restaurant } from '@/lib/auth/types';

type MenuFormState = {
  sectionTitle: string;
  items: string[];
};

const initialFormState: MenuFormState = {
  sectionTitle: '',
  items: [],
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

export default function MenusPage() {
  const { accessToken, user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [selectedCategoryId, setSelectedCategoryId] = useState('');
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [totalPages, setTotalPages] = useState(1);
  const [totalItems, setTotalItems] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingMenu, setEditingMenu] = useState<Menu | null>(null);
  const [formState, setFormState] = useState<MenuFormState>(initialFormState);
  const [itemDraft, setItemDraft] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const effectiveRestaurantId = isSuperAdmin ? selectedRestaurantId : user?.restaurantId ?? '';

  useEffect(() => {
    if (!accessToken || !isSuperAdmin) {
      return;
    }

    const token = accessToken;

    async function loadRestaurants() {
      try {
        const response = await fetchRestaurants(token, { page: 1, limit: 100, search: '' });
        setRestaurants(response.items);
        setSelectedRestaurantId((current) => current || response.items[0]?.id || '');
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
    if (!accessToken || !effectiveRestaurantId) {
      setMenus([]);
      setCategories([]);
      setTotalPages(1);
      setTotalItems(0);
      setIsLoading(false);
      return;
    }

    const token = accessToken;

    async function loadData() {
      try {
        setIsLoading(true);
        setError('');
        const [menusResponse, categoriesResponse] = await Promise.all([
          fetchMenus(token, {
            page,
            limit,
            search,
            categoryId: selectedCategoryId || undefined,
            ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
          }),
          fetchCategories(token, {
            page: 1,
            limit: 100,
            search: '',
            ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
          }),
        ]);

        setMenus(menusResponse.items);
        setTotalPages(menusResponse.pagination.totalPages);
        setTotalItems(menusResponse.pagination.total);
        setCategories(categoriesResponse.items);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to fetch menus.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [
    accessToken,
    effectiveRestaurantId,
    isSuperAdmin,
    limit,
    page,
    search,
    selectedCategoryId,
  ]);

  async function reloadMenus(token: string, nextPage: number) {
    if (!effectiveRestaurantId) {
      return;
    }

    const response = await fetchMenus(token, {
      page: nextPage,
      limit,
      search,
      categoryId: selectedCategoryId || undefined,
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
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(menu: Menu) {
    setEditingMenu(menu);
    setFormState({
      sectionTitle: menu.sections[0]?.sectionTitle ?? menu.title,
      items: [...(menu.sections[0]?.items ?? [])],
    });
    setItemDraft('');
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function addItems(rawValue?: string) {
    const values = parseSubitems(rawValue ?? itemDraft);
    if (!values.length) {
      return;
    }

    setFormState((current) => ({
      ...current,
      items: Array.from(new Set([...current.items, ...values])),
    }));
    setItemDraft('');
  }

  function removeItem(item: string) {
    setFormState((current) => ({
      ...current,
      items: current.items.filter((currentItem) => currentItem !== item),
    }));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!accessToken) {
      setError('Missing session token.');
      return;
    }

    if (!effectiveRestaurantId) {
      setError('Select a restaurant first.');
      return;
    }

    const token = accessToken;

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        title: formState.sectionTitle.trim(),
        sections: [
          {
            sectionTitle: formState.sectionTitle.trim(),
            items: Array.from(new Set(formState.items.map((item) => item.trim()))).filter(
              Boolean,
            ),
          },
        ],
        ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
      };

      if (editingMenu) {
        await updateMenu(token, editingMenu.id, payload);
        setSuccessMessage('Menu updated successfully.');
      } else {
        await createMenu(token, payload);
        setSuccessMessage('Menu created successfully.');
      }

      setIsModalOpen(false);
      const nextPage = editingMenu ? page : 1;
      setPage(nextPage);
      await reloadMenus(token, nextPage);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to save menu.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !menuToDelete) {
      return;
    }

    const token = accessToken;

    try {
      setIsDeleting(true);
      setError('');
      await deleteMenu(token, menuToDelete.id);
      setMenuToDelete(null);
      setSuccessMessage('Menu deleted successfully.');
      await reloadMenus(token, page);
    } catch (requestError) {
      setError(
        requestError instanceof Error ? requestError.message : 'Unable to delete menu.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const categoryLookup = useMemo(
    () => new Map(categories.map((category) => [category.id, category])),
    [categories],
  );

  const totalConfiguredSubitems = formState.items.length;

  return (
    <ConfigRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Configuration
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Menus</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create item groups like Mocktail or Soups and manage multiple subitems under each one.
            </p>
          </div>
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => setIsFiltersOpen((current) => !current)}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
            >
              {isFiltersOpen ? 'Hide search' : 'Search'}
            </button>
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

        {isFiltersOpen ? (
          <div
            className={`grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm ${
              isSuperAdmin ? 'md:grid-cols-3' : 'md:grid-cols-2'
            }`}
          >
            <div>
              <p className="text-xs text-slate-500">Total menus</p>
              <p className="mt-1 text-2xl font-bold text-slate-900">{totalItems}</p>
            </div>
            <RoleBasedRestaurantSelector
              isVisible={isSuperAdmin}
              restaurants={restaurants}
              value={selectedRestaurantId}
              onChange={(value) => {
                setSelectedRestaurantId(value);
                setPage(1);
                setSelectedCategoryId('');
              }}
            />
            <select
              value={selectedCategoryId}
              onChange={(event) => {
                setSelectedCategoryId(event.target.value);
                setPage(1);
              }}
              className={inputCls}
            >
              <option value="">All categories</option>
              {categories.map((category) => (
                <option key={category.id} value={category.id}>
                  {category.name}
                </option>
              ))}
            </select>
          </div>
        ) : null}

        {isFiltersOpen ? (
          <form
            className="flex w-full gap-3"
            onSubmit={(event) => {
              event.preventDefault();
              setPage(1);
              setSearch(searchInput);
            }}
          >
            <input
              value={searchInput}
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="Search by menu, item, or category"
              className={inputCls}
            />
            <button
              type="submit"
              className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
            >
              Search
            </button>
          </form>
        ) : null}

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

        <div className="space-y-4">
          {!effectiveRestaurantId ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-400 shadow-sm">
              Select a restaurant to view menus.
            </div>
          ) : isLoading ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-400 shadow-sm">
              Loading menus…
            </div>
          ) : menus.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-400 shadow-sm">
              No menus found.
            </div>
          ) : (
            menus.map((menu) => {
              const isOpen = openAccordionId === menu.id;
              const categoryName =
                menu.categoryName || categoryLookup.get(menu.categoryId)?.name || 'Category';
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

        {isModalOpen ? (
          <CommonModal
            title={editingMenu ? 'Edit item' : 'Create item'}
            description="Create one item at a time and manage its subitems."
            onClose={() => setIsModalOpen(false)}
            widthClassName="max-w-3xl"
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="space-y-3">
                <div>
                  <p className="text-sm font-semibold text-slate-900">Item name</p>
                  <p className="mt-1 text-sm text-slate-500">
                    Example: Mocktail, Soups, Desserts.
                  </p>
                </div>
                <input
                  value={formState.sectionTitle}
                  onChange={(event) =>
                    setFormState((current) => ({
                      ...current,
                      sectionTitle: event.target.value,
                    }))
                  }
                  onKeyDown={(event) => {
                    if (event.key === 'Enter') {
                      event.preventDefault();
                    }
                  }}
                  placeholder="Item name, e.g. Mocktail"
                  className={inputCls}
                />
              </div>

              <div className="grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
                <div className="space-y-3">
                  <div>
                    <p className="text-sm font-semibold text-slate-900">Add subitems</p>
                    <p className="mt-1 text-sm text-slate-500">
                      Type a subitem and press Enter.
                    </p>
                  </div>
                  <textarea
                    value={itemDraft}
                    onChange={(event) => setItemDraft(event.target.value)}
                    onKeyDown={(event) => {
                      if (event.key === 'Enter' && !event.shiftKey) {
                        event.preventDefault();
                        addItems();
                      }
                    }}
                    placeholder={'MINT MOJITO,\nORANGE MARTINI,\nPINEAPPLE MARTINI'}
                    className={`${inputCls} min-h-40 resize-none`}
                  />
                  <div className="flex justify-end">
                    <button
                      type="button"
                      onClick={() => addItems()}
                      className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
                    >
                      Add subitems
                    </button>
                  </div>
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Current subitems</p>
                      <p className="mt-1 text-sm text-slate-500">
                        Added subitems appear here.
                      </p>
                    </div>
                    <span className="rounded-full bg-white px-3 py-1 text-xs font-medium text-slate-600">
                      {totalConfiguredSubitems}
                    </span>
                  </div>
                  <div className="mt-4 max-h-64 overflow-y-auto pr-1">
                    <div className="flex flex-wrap gap-2">
                    {formState.items.length === 0 ? (
                      <p className="text-sm text-slate-400">No subitems added yet.</p>
                    ) : (
                      formState.items.map((item) => (
                        <span
                          key={`${formState.sectionTitle}-${item}`}
                          className="inline-flex items-center gap-2 rounded-full bg-white px-3 py-2 text-xs font-medium text-slate-700 ring-1 ring-slate-200"
                        >
                          {item}
                          <button
                            type="button"
                            onClick={() => removeItem(item)}
                            className="rounded-full bg-red-50 px-1.5 py-0.5 text-[10px] font-semibold text-red-600"
                          >
                            Remove
                          </button>
                        </span>
                      ))
                    )}
                    </div>
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60"
                >
                  {isSubmitting ? 'Saving…' : editingMenu ? 'Save changes' : 'Create menu'}
                </button>
              </div>
            </form>
          </CommonModal>
        ) : null}

        {menuToDelete ? (
          <ConfirmModal
            title={`Delete ${menuToDelete.title || 'menu'}?`}
            message="This removes the menu and all configured items and subitems."
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

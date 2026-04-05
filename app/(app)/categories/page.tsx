'use client';

import { FormEvent, useEffect, useMemo, useState } from 'react';
import { ConfigRoute } from '@/components/auth/config-route';
import { useAuth } from '@/components/auth/auth-provider';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import { RoleBasedRestaurantSelector } from '@/components/ui/role-based-restaurant-selector';
import {
  createCategory,
  deleteCategory,
  fetchCategories,
  fetchMenus,
  fetchRestaurants,
  updateCategory,
} from '@/lib/auth/api';
import { Category, CategoryMenuRule, Menu, Restaurant } from '@/lib/auth/types';
import { PageLoader, TableLoader } from '@/components/ui/page-loader';

type CategoryFormState = {
  name: string;
  pricePerPlate: string;
  description: string;
  menuRules: CategoryMenuRule[];
};

const initialFormState: CategoryFormState = {
  name: '',
  pricePerPlate: '',
  description: '',
  menuRules: [],
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

function makeRuleKey(menuId: string, sectionTitle: string) {
  return `${menuId}:${sectionTitle}`;
}

export default function CategoriesPage() {
  const { accessToken, user } = useAuth();
  const [categories, setCategories] = useState<Category[]>([]);
  const [menus, setMenus] = useState<Menu[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
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
  const [editingCategory, setEditingCategory] = useState<Category | null>(null);
  const [formState, setFormState] = useState<CategoryFormState>(initialFormState);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [categoryToDelete, setCategoryToDelete] = useState<Category | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [isItemPickerOpen, setIsItemPickerOpen] = useState(false);

  const isSuperAdmin = user?.role === 'super_admin';
  const effectiveRestaurantId = isSuperAdmin ? selectedRestaurantId : user?.restaurantId ?? '';
  const canLoad = Boolean(accessToken && effectiveRestaurantId);

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
      setCategories([]);
      setMenus([]);
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

        const [categoriesResponse, menusResponse] = await Promise.all([
          fetchCategories(token, {
            page,
            limit,
            search,
            ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
          }),
          fetchMenus(token, {
            page: 1,
            limit: 100,
            search: '',
            ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
          }),
        ]);

        setCategories(categoriesResponse.items);
        setTotalPages(categoriesResponse.pagination.totalPages);
        setTotalItems(categoriesResponse.pagination.total);
        setMenus(menusResponse.items);
      } catch (requestError) {
        setError(
          requestError instanceof Error
            ? requestError.message
            : 'Unable to fetch categories.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [accessToken, effectiveRestaurantId, isSuperAdmin, limit, page, search]);

  async function reloadCategories(token: string, nextPage: number) {
    if (!effectiveRestaurantId) {
      return;
    }

    const response = await fetchCategories(token, {
      page: nextPage,
      limit,
      search,
      ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
    });
    setCategories(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

  function openCreateModal() {
    setEditingCategory(null);
    setFormState(initialFormState);
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function openEditModal(category: Category) {
    setEditingCategory(category);
    setFormState({
      name: category.name,
      pricePerPlate: String(category.pricePerPlate),
      description: category.description ?? '',
      menuRules: category.menuRules.map((rule) => ({
        menuId: rule.menuId,
        menuTitle: rule.menuTitle,
        sectionTitle: rule.sectionTitle,
        allowedItems: [...rule.allowedItems],
        selectionLimit: rule.selectionLimit,
      })),
    });
    setError('');
    setSuccessMessage('');
    setIsModalOpen(true);
  }

  function toggleRule(menu: Menu, sectionTitle: string) {
    const key = makeRuleKey(menu.id, sectionTitle);
    const exists = formState.menuRules.some(
      (rule) => makeRuleKey(rule.menuId, rule.sectionTitle) === key,
    );

    if (exists) {
      setFormState((current) => ({
        ...current,
        menuRules: current.menuRules.filter(
          (rule) => makeRuleKey(rule.menuId, rule.sectionTitle) !== key,
        ),
      }));
      return;
    }

    setFormState((current) => ({
      ...current,
      menuRules: [
        ...current.menuRules,
        {
          menuId: menu.id,
          menuTitle: menu.title,
          sectionTitle,
          allowedItems: [],
          selectionLimit: 0,
        },
      ],
    }));
  }

  function addRule(menu: Menu, sectionTitle: string) {
    const key = makeRuleKey(menu.id, sectionTitle);
    const exists = formState.menuRules.some(
      (rule) => makeRuleKey(rule.menuId, rule.sectionTitle) === key,
    );

    if (exists) {
      return;
    }

    setFormState((current) => ({
      ...current,
      menuRules: [
        ...current.menuRules,
        {
          menuId: menu.id,
          menuTitle: menu.title,
          sectionTitle,
          allowedItems: [],
          selectionLimit: 0,
        },
      ],
    }));
    setIsItemPickerOpen(false);
  }

  function updateRuleSelectionLimit(
    menuId: string,
    sectionTitle: string,
    nextValue: string,
    maxAvailableItems: number,
  ) {
    const parsed = nextValue === '' ? 0 : Math.min(Math.max(1, Number(nextValue) || 1), maxAvailableItems);
    setFormState((current) => ({
      ...current,
      menuRules: current.menuRules.map((rule) =>
        rule.menuId === menuId && rule.sectionTitle === sectionTitle
          ? {
              ...rule,
              selectionLimit: Math.min(parsed, maxAvailableItems),
            }
          : rule,
      ),
    }));
  }

  function toggleAllowedItem(menuId: string, sectionTitle: string, item: string) {
    setFormState((current) => ({
      ...current,
      menuRules: current.menuRules.map((rule) => {
        if (rule.menuId !== menuId || rule.sectionTitle !== sectionTitle) {
          return rule;
        }

        const exists = rule.allowedItems.includes(item);
        const allowedItems = exists
          ? rule.allowedItems.filter((currentItem) => currentItem !== item)
          : [...rule.allowedItems, item];

        return {
          ...rule,
          allowedItems,
          selectionLimit: exists
            ? Math.min(rule.selectionLimit, allowedItems.length || 1)
            : rule.selectionLimit,
        };
      }),
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

    const invalidRule = formState.menuRules.find(
      (rule) => !rule.allowedItems.length || rule.selectionLimit < 1 || rule.selectionLimit > rule.allowedItems.length,
    );

    if (invalidRule) {
      setError(
        `Check the configuration for ${invalidRule.sectionTitle}. Enter a selection limit between 1 and the number of allowed subitems.`,
      );
      return;
    }

    const token = accessToken;

    try {
      setIsSubmitting(true);
      setError('');

      const payload = {
        name: formState.name.trim(),
        pricePerPlate: Number(formState.pricePerPlate),
        description: formState.description.trim() || null,
        menuRules: formState.menuRules.map((rule) => ({
          menuId: rule.menuId,
          sectionTitle: rule.sectionTitle,
          allowedItems: rule.allowedItems,
          selectionLimit: rule.selectionLimit,
        })),
        ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
      };

      if (editingCategory) {
        await updateCategory(token, editingCategory.id, payload);
        setSuccessMessage('Category updated successfully.');
      } else {
        await createCategory(token, payload);
        setSuccessMessage('Category created successfully.');
      }

      setIsModalOpen(false);
      const nextPage = editingCategory ? page : 1;
      setPage(nextPage);
      await reloadCategories(token, nextPage);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to save category.',
      );
    } finally {
      setIsSubmitting(false);
    }
  }

  async function handleDelete() {
    if (!accessToken || !categoryToDelete) {
      return;
    }

    try {
      setIsDeleting(true);
      setError('');
      await deleteCategory(accessToken, categoryToDelete.id);
      setCategoryToDelete(null);
      setSuccessMessage('Category deleted successfully.');
      await reloadCategories(accessToken, page);
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : 'Unable to delete category.',
      );
    } finally {
      setIsDeleting(false);
    }
  }

  const configuredRuleCount = formState.menuRules.length;
  const configuredVisibleItemsCount = formState.menuRules.reduce(
    (count, rule) => count + rule.allowedItems.length,
    0,
  );
  const configuredTotalItemsCount = formState.menuRules.reduce(
    (count, rule) => count + rule.selectionLimit,
    0,
  );

  const groupedMenus = useMemo(
    () =>
      menus.map((menu) => ({
        ...menu,
        visibleSections: menu.sections.filter((section) => section.items.length > 0),
      })),
    [menus],
  );

  const availableSections = useMemo(
    () =>
      groupedMenus.flatMap((menu) =>
        menu.visibleSections
          .filter(
            (section) =>
              !formState.menuRules.some(
                (rule) =>
                  rule.menuId === menu.id && rule.sectionTitle === section.sectionTitle,
              ),
          )
          .map((section) => ({
            menu,
            section,
          })),
      ),
    [formState.menuRules, groupedMenus],
  );

  return (
    <ConfigRoute>
      <section className="space-y-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest text-amber-600">
              Configuration
            </p>
            <h1 className="mt-1 text-2xl font-bold text-slate-900">Categories</h1>
            <p className="mt-1 text-sm text-slate-500">
              Create booking categories with item-wise visibility and selection limits.
            </p>
          </div>
          <div className="flex w-full items-center justify-between gap-3 sm:w-auto sm:justify-end">
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
              disabled={!canLoad}
              className="ml-auto rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:cursor-not-allowed disabled:opacity-50"
            >
              + Add category
            </button>
          </div>
        </div>

        {isFiltersOpen ? (
          <div className="grid gap-4 rounded-2xl border border-slate-200 bg-white p-5 shadow-sm md:grid-cols-[1fr_2fr] md:items-center">
            <div className="space-y-2">
              <p className="text-xs text-slate-500">Total categories</p>
              <p className="text-2xl font-bold text-slate-900">{totalItems}</p>
              <div className="mt-3">
                <RoleBasedRestaurantSelector
                  isVisible={isSuperAdmin}
                  restaurants={restaurants}
                  value={selectedRestaurantId}
                  onChange={(value) => {
                    setSelectedRestaurantId(value);
                    setPage(1);
                  }}
                />
              </div>
            </div>
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
                placeholder="Search by category name or description"
                className={inputCls}
              />
              <button
                type="submit"
                className="rounded-xl bg-amber-400 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-amber-500"
              >
                Search
              </button>
            </form>
          </div>
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

        <div className="hidden overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-sm md:block">
          <div className="overflow-x-auto">
            <table className="min-w-full text-left text-sm">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50">
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Category</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Price</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Configured Items</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Description</th>
                  <th className="px-5 py-3.5 text-xs font-semibold uppercase tracking-wider text-slate-500">Actions</th>
                </tr>
              </thead>
              <tbody>
                {!effectiveRestaurantId ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={5}>
                      Select a restaurant to view categories.
                    </td>
                  </tr>
                ) : isLoading ? (
                  <TableLoader colSpan={5} message="Loading categories…" />
                ) : categories.length === 0 ? (
                  <tr>
                    <td className="px-5 py-8 text-center text-sm text-slate-400" colSpan={5}>
                      No categories found.
                    </td>
                  </tr>
                ) : (
                  categories.map((category) => (
                    <tr key={category.id} className="border-t border-slate-100 hover:bg-slate-50/60">
                      <td className="px-5 py-4">
                        <p className="font-semibold text-slate-900">{category.name}</p>
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        ₹{category.pricePerPlate.toFixed(2)}
                      </td>
                      <td className="px-5 py-4 text-slate-700">
                        <p>{category.menuRules.length} item rule{category.menuRules.length === 1 ? '' : 's'}</p>
                        <p className="mt-1 text-xs text-slate-500">
                          {category.menuRules.reduce((count, rule) => count + rule.allowedItems.length, 0)} visible subitems
                        </p>
                      </td>
                      <td className="px-5 py-4 text-slate-500">
                        {category.description || 'No description'}
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex gap-2">
                          <button
                            type="button"
                            onClick={() => openEditModal(category)}
                            className="rounded-xl border border-slate-200 px-3 py-2 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                          >
                            Edit
                          </button>
                          <button
                            type="button"
                            onClick={() => setCategoryToDelete(category)}
                            className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                          >
                            Delete
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="space-y-3 md:hidden">
          {!effectiveRestaurantId ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400 shadow-sm">
              Select a restaurant to view categories.
            </div>
          ) : isLoading ? (
            <PageLoader message="Loading categories…" />
          ) : categories.length === 0 ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-4 py-5 text-center text-sm text-slate-400 shadow-sm">
              No categories found.
            </div>
          ) : (
            categories.map((category) => (
              <article
                key={`mobile-${category.id}`}
                className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
              >
                <p className="text-sm font-semibold text-slate-900">{category.name}</p>
                <p className="mt-1 text-xs font-medium text-slate-700">
                  ₹{category.pricePerPlate.toFixed(2)} / plate
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  {category.menuRules.length} item rule{category.menuRules.length === 1 ? '' : 's'} ·{' '}
                  {category.menuRules.reduce((count, rule) => count + rule.allowedItems.length, 0)} visible subitems
                </p>
                <p className="mt-1 text-xs text-slate-500">{category.description || 'No description'}</p>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => openEditModal(category)}
                    className="rounded-xl border border-slate-200 px-3 py-2 text-xs font-medium text-slate-600"
                  >
                    Edit
                  </button>
                  <button
                    type="button"
                    onClick={() => setCategoryToDelete(category)}
                    className="rounded-xl border border-red-200 px-3 py-2 text-xs font-medium text-red-600"
                  >
                    Delete
                  </button>
                </div>
              </article>
            ))
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
            title={editingCategory ? 'Edit category setup' : 'Create category setup'}
            description="Name the category, then choose which menu items are available for booking and how many selections each item allows."
            onClose={() => setIsModalOpen(false)}
            widthClassName="max-w-6xl"
          >
            <form className="space-y-6" onSubmit={handleSubmit}>
              <div className="grid gap-4 lg:grid-cols-[1.2fr_0.8fr]">
                <div className="grid gap-4 md:grid-cols-2">
                  <input
                    value={formState.name}
                    onChange={(event) =>
                      setFormState((current) => ({ ...current, name: event.target.value }))
                    }
                    placeholder="Category name"
                    className={inputCls}
                  />
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={formState.pricePerPlate}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        pricePerPlate: event.target.value,
                      }))
                    }
                    placeholder="Price per plate"
                    className={inputCls}
                  />
                  <textarea
                    value={formState.description}
                    onChange={(event) =>
                      setFormState((current) => ({
                        ...current,
                        description: event.target.value,
                      }))
                    }
                    placeholder="Description (optional)"
                    className={`${inputCls} min-h-28 resize-none md:col-span-2`}
                  />
                </div>

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-4">
                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    Category Summary
                  </p>
                  <div className="mt-3 grid gap-3 sm:grid-cols-3">
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Items</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{configuredRuleCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Sub Items</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{configuredVisibleItemsCount}</p>
                    </div>
                    <div className="rounded-xl border border-slate-200 bg-white p-3">
                      <p className="text-xs text-slate-500">Total Item Count</p>
                      <p className="mt-1 text-xl font-bold text-slate-900">{configuredTotalItemsCount}</p>
                    </div>
                  </div>
                  <p className="mt-3 text-sm text-slate-500">
                    Description is optional. Add only the items you want in this category, then configure visible subitems and limits.
                  </p>
                </div>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold text-slate-900">Category Item Configuration</h3>
                  <p className="mt-1 text-sm text-slate-500">
                    Add only the items you want in this category. Each added item can then be configured below.
                  </p>
                </div>

                <div className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <h4 className="text-lg font-semibold text-slate-900">Selected Items</h4>
                      <p className="mt-1 text-sm text-slate-500">
                        Add items one by one, then configure booking count and visible subitems.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => setIsItemPickerOpen(true)}
                      disabled={availableSections.length === 0}
                      className="rounded-xl bg-slate-900 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-slate-700 disabled:cursor-not-allowed disabled:opacity-50"
                    >
                      + Add item
                    </button>
                  </div>
                </div>

                <div className="space-y-4">
                  {formState.menuRules.length === 0 ? (
                    <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                      No item added yet. Use `Add item` to choose a menu item and start configuring it.
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {formState.menuRules.map((rule) => {
                        const menu = groupedMenus.find((item) => item.id === rule.menuId);
                        const section = menu?.visibleSections.find(
                          (item) => item.sectionTitle === rule.sectionTitle,
                        );

                        if (!menu || !section) {
                          return null;
                        }

                        return (
                          <div
                            key={`${rule.menuId}-${rule.sectionTitle}-config`}
                            className="rounded-[28px] border border-slate-200 bg-white p-5 shadow-sm"
                          >
                            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                              <div>
                                {menu.title?.trim().toLowerCase() !==
                                rule.sectionTitle.trim().toLowerCase() ? (
                                  <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                    {menu.title || 'Untitled menu'}
                                  </p>
                                ) : null}
                                <h5 className="mt-1 text-lg font-semibold text-slate-900">
                                  {rule.sectionTitle}
                                </h5>
                              </div>
                              <button
                                type="button"
                                onClick={() => toggleRule(menu, rule.sectionTitle)}
                                className="rounded-xl border border-red-200 px-3 py-2 text-sm font-medium text-red-600 transition hover:bg-red-50"
                              >
                                Remove item
                              </button>
                            </div>

                            <div className="mt-5 grid gap-5 lg:grid-cols-[220px_1fr]">
                              <div>
                                <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                  Selectable Count During Booking
                                </label>
                                <input
                                  type="text"
                                  inputMode="numeric"
                                  pattern="[0-9]*"
                                  value={rule.selectionLimit === 0 ? '' : String(rule.selectionLimit)}
                                  onChange={(event) =>
                                    updateRuleSelectionLimit(
                                      rule.menuId,
                                      rule.sectionTitle,
                                      event.target.value,
                                      section.items.length,
                                    )
                                  }
                                  placeholder="e.g. 2"
                                  className={`${inputCls} mt-2 max-w-32`}
                                />
                                {rule.selectionLimit > 0 && (
                                  <p className="mt-2 text-xs text-slate-500">
                                    Select up to {rule.selectionLimit} option{rule.selectionLimit === 1 ? '' : 's'} during booking.
                                  </p>
                                )}
                              </div>

                              <div>
                                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                                  Visible Subitems
                                </p>
                                <p className="mt-1 text-sm text-slate-500">
                                  Start with none selected, then choose only the subitems that should appear while booking.
                                </p>
                                <div className="mt-3 grid gap-2 sm:grid-cols-2 xl:grid-cols-3">
                                  {section.items.map((item) => {
                                    const checked = rule.allowedItems.includes(item);
                                    return (
                                      <button
                                        key={`${rule.menuId}-${rule.sectionTitle}-${item}`}
                                        type="button"
                                        onClick={() =>
                                          toggleAllowedItem(rule.menuId, rule.sectionTitle, item)
                                        }
                                        className={`group flex items-center gap-3 rounded-2xl border px-3 py-3 text-left text-sm transition ${
                                          checked
                                            ? 'border-amber-300 bg-gradient-to-br from-amber-50 to-white text-slate-900 shadow-sm'
                                            : 'border-slate-200 bg-white text-slate-700 hover:border-slate-300 hover:bg-slate-50'
                                        }`}
                                        aria-pressed={checked}
                                      >
                                        <span
                                          className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border transition ${
                                            checked
                                              ? 'border-amber-500 bg-amber-500 text-white shadow-sm'
                                              : 'border-slate-300 bg-white text-transparent group-hover:border-slate-400'
                                          }`}
                                        >
                                          <svg
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                            className="h-3.5 w-3.5"
                                          >
                                            <path
                                              fillRule="evenodd"
                                              d="M16.704 5.29a1 1 0 010 1.42l-7.2 7.2a1 1 0 01-1.415 0l-3.6-3.6a1 1 0 111.415-1.42l2.893 2.894 6.493-6.494a1 1 0 011.414 0z"
                                              clipRule="evenodd"
                                            />
                                          </svg>
                                        </span>
                                        <span className="font-medium">{item}</span>
                                      </button>
                                    );
                                  })}
                                </div>
                                {!rule.allowedItems.length ? (
                                  <div className="mt-3 rounded-xl border border-dashed border-amber-200 bg-amber-50/60 px-3 py-2 text-xs font-medium text-amber-800">
                                    Select the subitems that should be visible in this category.
                                  </div>
                                ) : null}
                              </div>
                            </div>
                          </div>
                        );
                      })}

                      {availableSections.length > 0 ? (
                        <div className="flex justify-center pt-2">
                          <button
                            type="button"
                            onClick={() => setIsItemPickerOpen(true)}
                            className="rounded-xl border border-slate-200 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 transition hover:border-amber-300 hover:bg-amber-50 hover:text-slate-900"
                          >
                            + Add another item
                          </button>
                        </div>
                      ) : null}
                    </div>
                  )}
                </div>
              </div>

              <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 sm:w-auto"
                >
                  Cancel
                </button>
                <LoadingButton
                  type="submit"
                  disabled={isSubmitting}
                  isLoading={isSubmitting}
                  className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-white shadow-sm transition hover:bg-amber-500 disabled:opacity-60 sm:w-auto"
                >
                  {editingCategory ? 'Save changes' : 'Create category'}
                </LoadingButton>
              </div>
            </form>
          </CommonModal>
        ) : null}

        {categoryToDelete ? (
          <ConfirmModal
            title={`Delete ${categoryToDelete.name}?`}
            message="This removes the category configuration and its item visibility rules."
            confirmLabel="Delete"
            isLoading={isDeleting}
            onCancel={() => setCategoryToDelete(null)}
            onConfirm={() => void handleDelete()}
          />
        ) : null}

        {isItemPickerOpen ? (
          <CommonModal
            title="Add category item"
            description="Choose one menu item to add to this category. You can add more items one by one."
            onClose={() => setIsItemPickerOpen(false)}
            widthClassName="max-w-3xl"
          >
            <div className="space-y-4">
              {availableSections.length === 0 ? (
                <div className="rounded-2xl border border-dashed border-slate-200 bg-slate-50 px-4 py-8 text-center text-sm text-slate-500">
                  No more menu items are available to add.
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {availableSections.map(({ menu, section }) => (
                    <button
                      key={`${menu.id}-${section.sectionTitle}-picker`}
                      type="button"
                      onClick={() => addRule(menu, section.sectionTitle)}
                      className="rounded-2xl border border-slate-200 bg-white p-4 text-left transition hover:border-amber-300 hover:bg-amber-50/50"
                    >
                      {menu.title?.trim().toLowerCase() !==
                      section.sectionTitle.trim().toLowerCase() ? (
                        <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                          {menu.title || 'Untitled menu'}
                        </p>
                      ) : null}
                      <h4 className="mt-1 text-base font-semibold text-slate-900">
                        {section.sectionTitle}
                      </h4>
                      <p className="mt-1 text-sm text-slate-500">
                        {section.items.length} available subitems
                      </p>
                    </button>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-end">
                <button
                  type="button"
                  onClick={() => setIsItemPickerOpen(false)}
                  className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50"
                >
                  Close
                </button>
              </div>
            </div>
          </CommonModal>
        ) : null}
      </section>
    </ConfigRoute>
  );
}

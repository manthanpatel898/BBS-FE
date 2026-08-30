'use client';

import { useRef, useEffect, useMemo, useReducer, useState } from 'react';
import { ConfigRoute } from '@/components/auth/config-route';
import { useAuth } from '@/components/auth/auth-provider';
import { useAppPageHeader } from '@/components/layouts/app-layout';
import { CommonModal } from '@/components/ui/common-modal';
import { ConfirmModal } from '@/components/ui/confirm-modal';
import { LoadingButton } from '@/components/ui/loading-button';
import { RoleBasedRestaurantSelector } from '@/components/ui/role-based-restaurant-selector';
import {
  confirmMenuSync,
  createMenu,
  deleteMenu,
  downloadMenuSyncExport,
  fetchMenus,
  fetchRestaurants,
  previewMenuSync,
  updateMenu,
} from '@/lib/auth/api';
import { Menu, MenuSection, Restaurant } from '@/lib/auth/types';
import { PageLoader } from '@/components/ui/page-loader';
import { MenuSyncPreviewPanel } from '@/components/menus/menu-sync-preview-panel';
import { BulkSubitemPanel } from '@/components/menus/bulk-subitem-panel';
import {
  canConfirmMenuSync,
  initialMenuSyncState,
  menuSyncReducer,
} from '@/lib/menus/menu-sync';

type MenuFormState = {
  sectionTitle: string;
  displayOrder: string;
  items: Array<{
    name: string;
    description: string;
  }>;
  hotSellingItems: string[];
};

const initialFormState: MenuFormState = {
  sectionTitle: '',
  displayOrder: '',
  items: [],
  hotSellingItems: [],
};

const inputCls =
  'w-full rounded-xl border border-slate-300 bg-white px-4 py-3 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100';

function downloadFile(content: string | Blob, filename: string, mimeType: string) {
  const blob =
    content instanceof Blob ? content : new Blob([content], { type: mimeType });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

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

export default function MenusPage() {
  useAppPageHeader({
    eyebrow: 'Menus',
    title: 'Menus',
  });
  const { accessToken, user } = useAuth();
  const [menus, setMenus] = useState<Menu[]>([]);
  const [restaurants, setRestaurants] = useState<Restaurant[]>([]);
  const [selectedRestaurantId, setSelectedRestaurantId] = useState('');
  const [openAccordionId, setOpenAccordionId] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [searchInput, setSearchInput] = useState('');
  const [page, setPage] = useState(1);
  const searchDebounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
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
  const [itemDescriptionDraft, setItemDescriptionDraft] = useState('');
  const [subitemSearch, setSubitemSearch] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [menuToDelete, setMenuToDelete] = useState<Menu | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const [isBulkOpen, setIsBulkOpen] = useState(false);
  const [syncFile, setSyncFile] = useState<File | null>(null);
  const [syncState, dispatchSync] = useReducer(menuSyncReducer, initialMenuSyncState);
  const [syncDownloadFormat, setSyncDownloadFormat] = useState<'csv' | 'xlsx' | null>(null);
  const [isSyncConfirmOpen, setIsSyncConfirmOpen] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const isSuperAdmin = user?.role === 'super_admin';
  const effectiveRestaurantId = isSuperAdmin ? selectedRestaurantId : user?.restaurantId ?? '';

  function getMenuQueryParams(requestedPage: number) {
    return {
      page: requestedPage,
      limit,
      search,
      ...(isSuperAdmin ? { restaurantId: effectiveRestaurantId } : {}),
    };
  }

  async function loadMenusPage(token: string, displayPage: number) {
    const response = await fetchMenus(token, getMenuQueryParams(displayPage));
    setMenus(response.items);
    setTotalPages(response.pagination.totalPages);
    setTotalItems(response.pagination.total);
  }

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
        await loadMenusPage(token, page);
      } catch (requestError) {
        setError(
          requestError instanceof Error ? requestError.message : 'Unable to fetch menus.',
        );
      } finally {
        setIsLoading(false);
      }
    }

    void loadData();
  }, [accessToken, effectiveRestaurantId, isSuperAdmin, limit, page, search]);

  useEffect(() => {
    const trimmed = searchInput.trim();
    if (trimmed.length === 0) {
      setSearch('');
      setPage(1);
      return;
    }
    if (trimmed.length < 3) return;

    if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    searchDebounceRef.current = setTimeout(() => {
      setSearch(trimmed);
      setPage(1);
    }, 300);

    return () => {
      if (searchDebounceRef.current) clearTimeout(searchDebounceRef.current);
    };
  }, [searchInput]);

  async function reloadMenus(token: string, nextPage: number) {
    if (!effectiveRestaurantId) {
      return;
    }

    await loadMenusPage(token, nextPage);
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

  function openEditModal(menu: Menu) {
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
    if (!values.length) {
      return;
    }

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
            items: Array.from(new Set(formState.items.map((item) => item.name.trim()))).filter(
              Boolean,
            ),
            hotSellingItems: Array.from(
              new Set(formState.hotSellingItems.map((item) => item.trim())),
            ).filter(Boolean),
            subitemDescriptions: Array.from(
              new Map(
                formState.items
                  .map((item) => [
                    item.name.trim(),
                    {
                      name: item.name.trim(),
                      description: item.description.trim(),
                    },
                  ] as const)
                  .filter(([name]) => Boolean(name)),
              ).values(),
            ),
          },
        ],
        ...(formState.displayOrder.trim()
          ? { displayOrder: Number(formState.displayOrder) }
          : {}),
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

  function openBulkModal() {
    setSyncFile(null);
    dispatchSync({ type: 'RESET' });
    if (fileInputRef.current) fileInputRef.current.value = '';
    setIsBulkOpen(true);
  }

  function closeBulkModal() {
    if (syncState.phase === 'uploading' || syncState.phase === 'confirming') return;
    setIsBulkOpen(false);
  }

  async function handleSyncPreview(event: { preventDefault(): void }) {
    event.preventDefault();
    if (!syncFile || !accessToken || !effectiveRestaurantId) return;
    dispatchSync({ type: 'UPLOAD_STARTED', fileName: syncFile.name });
    try {
      const preview = await previewMenuSync(
        accessToken,
        syncFile,
        isSuperAdmin ? effectiveRestaurantId : undefined,
      );
      dispatchSync({ type: 'PREVIEW_RECEIVED', preview });
    } catch (requestError) {
      dispatchSync({ type: 'REQUEST_FAILED', message: requestError instanceof Error ? requestError.message : 'Unable to preview menu changes.' });
    }
  }

  async function handleSyncDownload(format: 'csv' | 'xlsx') {
    if (!accessToken || !effectiveRestaurantId) return;
    try {
      setSyncDownloadFormat(format);
      const blob = await downloadMenuSyncExport(accessToken, format, isSuperAdmin ? effectiveRestaurantId : undefined);
      downloadFile(blob, `menus-current.${format}`, blob.type);
    } catch (requestError) {
      dispatchSync({ type: 'REQUEST_FAILED', message: requestError instanceof Error ? requestError.message : 'Unable to download menu data.' });
    } finally {
      setSyncDownloadFormat(null);
    }
  }

  async function handleSyncConfirm() {
    if (!accessToken || !syncState.preview || !canConfirmMenuSync(syncState)) return;
    setIsSyncConfirmOpen(false);
    dispatchSync({ type: 'CONFIRM_STARTED' });
    try {
      const result = await confirmMenuSync(accessToken, syncState.preview.previewId, isSuperAdmin ? effectiveRestaurantId : undefined);
      dispatchSync({ type: 'CONFIRM_SUCCEEDED', result });
      setSuccessMessage('Menus synchronized successfully.');
      setPage(1);
      await reloadMenus(accessToken, 1);
    } catch (requestError) {
      dispatchSync({ type: 'REQUEST_FAILED', message: requestError instanceof Error ? requestError.message : 'Unable to synchronize menus.' });
    }
  }

  const totalConfiguredSubitems = formState.items.length;
  const filteredSubitems = useMemo(() => {
    const query = subitemSearch.trim().toLowerCase();
    if (!query) return formState.items;
    return formState.items.filter(
      (item) =>
        item.name.toLowerCase().includes(query) ||
        item.description.toLowerCase().includes(query),
    );
  }, [formState.items, subitemSearch]);

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
              onClick={openBulkModal}
              disabled={!effectiveRestaurantId}
              className="rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-600 transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50"
            >
              Export & Sync
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
            onChange={(event) => setSearchInput(event.target.value)}
            placeholder="Search by menu name or subitem… (min. 3 characters)"
            className="w-full rounded-xl border border-slate-300 bg-white py-3 pl-11 pr-4 text-sm text-slate-900 placeholder:text-slate-400 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
          />
          {searchInput.length > 0 && searchInput.length < 3 ? (
            <span className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-xs text-slate-400">
              {3 - searchInput.length} more character{3 - searchInput.length !== 1 ? 's' : ''}…
            </span>
          ) : null}
          {searchInput.length >= 3 ? (
            <button
              type="button"
              onClick={() => setSearchInput('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 rounded-lg p-1 text-slate-400 transition hover:bg-slate-100 hover:text-slate-600"
              aria-label="Clear search"
            >
              <svg className="h-4 w-4" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round">
                <path d="M18 6 6 18M6 6l12 12" />
              </svg>
            </button>
          ) : null}
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

        <div className="space-y-4">
          {!effectiveRestaurantId ? (
            <div className="rounded-2xl border border-slate-200 bg-white px-5 py-6 text-center text-sm text-slate-400 shadow-sm">
              Select a restaurant to view menus.
            </div>
          ) : isLoading ? (
            <PageLoader message="Loading menus…" />
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
                        if (event.key === 'Enter') {
                          event.preventDefault();
                        }
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

                <BulkSubitemPanel
                  existingItems={formState.items.map((item) => item.name)}
                  onAdd={(items) =>
                    setFormState((current) => ({
                      ...current,
                      items: [
                        ...current.items,
                        ...items.map((name) => ({ name, description: '' })),
                      ],
                    }))
                  }
                />

                <div className="rounded-2xl border border-slate-200 bg-slate-50 p-3">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-slate-900">Current subitems</p>
                    </div>
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
            title={`Delete ${menuToDelete.title || 'menu'}?`}
            message="This removes the menu and all configured items and subitems."
            confirmLabel="Delete"
            isLoading={isDeleting}
            onCancel={() => setMenuToDelete(null)}
            onConfirm={() => void handleDelete()}
          />
        ) : null}

        {isBulkOpen ? (
          <CommonModal
            title="Export & Sync Menus"
            description="Download the restaurant's complete current menu data, edit it, and preview every change before applying it."
            onClose={closeBulkModal}
            widthClassName="max-w-4xl"
          >
            <div className="space-y-5">
              <div className="rounded-xl border border-slate-200 bg-slate-50 p-4">
                <p className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                  1. Download current menu data
                </p>
                <p className="mt-1 text-sm text-slate-600">
                  Every subitem is on its own row. Do not edit the hidden menuId or categoryId columns.
                </p>
                <div className="mt-3 grid gap-2 sm:grid-cols-2">
                  <LoadingButton
                    type="button"
                    onClick={() => void handleSyncDownload('csv')}
                    disabled={syncDownloadFormat !== null}
                    isLoading={syncDownloadFormat === 'csv'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-100 disabled:opacity-60"
                  >
                    Download Current CSV
                  </LoadingButton>
                  <LoadingButton
                    type="button"
                    onClick={() => void handleSyncDownload('xlsx')}
                    disabled={syncDownloadFormat !== null}
                    isLoading={syncDownloadFormat === 'xlsx'}
                    className="w-full rounded-xl border border-emerald-300 bg-emerald-50 px-4 py-2.5 text-sm font-semibold text-emerald-800 transition hover:bg-emerald-100 disabled:opacity-60"
                  >
                    Download Current Excel
                  </LoadingButton>
                </div>
              </div>

              <div className="space-y-1 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900">
                <p className="font-semibold">The uploaded file is the complete current menu snapshot.</p>
                <p>Blank menu IDs create new menus. Missing active menus are deactivated.</p>
                <p>Missing sections or subitems from an included menu are removed from current configuration. Historical bookings are unchanged.</p>
              </div>

              <form onSubmit={(event) => void handleSyncPreview(event)} className="space-y-4">
                <div className="flex flex-col gap-1.5">
                  <label className="text-xs font-semibold uppercase tracking-wider text-slate-500">
                    2. Upload the edited CSV or Excel file
                  </label>
                  <input
                    ref={fileInputRef}
                    type="file"
                    accept=".csv,.xlsx"
                    disabled={syncState.phase === 'uploading' || syncState.phase === 'confirming'}
                    onChange={(event) => {
                      const file = event.target.files?.[0] ?? null;
                      setSyncFile(file);
                      dispatchSync({ type: 'FILE_SELECTED', fileName: file?.name ?? '' });
                    }}
                    className="w-full cursor-pointer rounded-xl border border-slate-300 bg-white px-4 py-2.5 text-sm text-slate-700 file:mr-3 file:rounded-lg file:border-0 file:bg-amber-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-amber-700 outline-none transition focus:border-amber-400 focus:ring-2 focus:ring-amber-100"
                  />
                </div>

                {syncState.errorMessage ? (
                  <div className="rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
                    {syncState.errorMessage}
                  </div>
                ) : null}

                {syncState.preview ? <MenuSyncPreviewPanel preview={syncState.preview} /> : null}

                {syncState.phase === 'success' && syncState.result ? (
                  <div className="rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800">Menus synchronized successfully. The menu list has been refreshed.</div>
                ) : null}

                <div className="grid gap-2 border-t border-slate-200 pt-4 sm:flex sm:justify-end">
                  <button
                    type="button"
                    onClick={closeBulkModal}
                    disabled={syncState.phase === 'uploading' || syncState.phase === 'confirming'}
                    className="w-full rounded-xl border border-slate-200 px-4 py-2.5 text-sm font-medium text-slate-700 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                  >
                    Close
                  </button>
                  <LoadingButton
                    type="submit"
                    disabled={!syncFile || syncState.phase === 'uploading' || syncState.phase === 'confirming'}
                    isLoading={syncState.phase === 'uploading'}
                    className="w-full rounded-xl border border-slate-300 bg-white px-5 py-2.5 text-sm font-semibold text-slate-800 transition hover:bg-slate-50 disabled:opacity-60 sm:w-auto"
                  >
                    Preview Changes
                  </LoadingButton>
                  {syncState.preview ? (
                    <LoadingButton
                      type="button"
                      onClick={() => setIsSyncConfirmOpen(true)}
                      disabled={!canConfirmMenuSync(syncState)}
                      isLoading={syncState.phase === 'confirming'}
                      className="w-full rounded-xl bg-amber-400 px-5 py-2.5 text-sm font-semibold text-slate-950 shadow-sm transition hover:bg-amber-500 disabled:opacity-50 sm:w-auto"
                    >
                      Confirm Synchronization
                    </LoadingButton>
                  ) : null}
                </div>
              </form>
            </div>
          </CommonModal>
        ) : null}

        {isSyncConfirmOpen && syncState.preview ? (
          <ConfirmModal
            title="Synchronize menus?"
            message={`This will create ${syncState.preview.summary.create}, update ${syncState.preview.summary.update}, reactivate ${syncState.preview.summary.reactivate}, deactivate ${syncState.preview.summary.deactivate}, remove ${syncState.preview.summary.removedSections} sections, and remove ${syncState.preview.summary.removedSubitems} subitems. Historical bookings will not change.`}
            confirmLabel="Synchronize"
            isLoading={syncState.phase === 'confirming'}
            onCancel={() => setIsSyncConfirmOpen(false)}
            onConfirm={() => void handleSyncConfirm()}
          />
        ) : null}
      </section>
    </ConfigRoute>
  );
}
